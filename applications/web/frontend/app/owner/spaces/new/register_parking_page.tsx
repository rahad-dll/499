"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { CamerasStep } from "@/components/register-lot/CamerasStep";
import { DetailsStep } from "@/components/register-lot/DetailsStep";
import {
  EMPTY_FORM,
  cameraSlotProblem,
  pickedLocation,
  stepError,
  type LotForm,
  type LotFormPatch,
  type WizardStep,
} from "@/components/register-lot/form-state";
import { SlotsStep } from "@/components/register-lot/SlotsStep";
import { useDraftCameras } from "@/components/register-lot/use-draft-cameras";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { normalizeBangladeshPhone } from "@/lib/auth/phone";
import {
  buildCameraInput,
  buildCreateInput,
  buildVehicleRates,
  defaultVehicleRates,
  type VehicleRates,
} from "@/lib/spaces/layout";
import { ParkingSpaceError, parkingSpacesRepository } from "@/lib/spaces/repository";
import { cn } from "@/lib/utils";

const STEPS: { id: WizardStep; title: string; sub: string }[] = [
  { id: 1, title: "Lot details", sub: "Name, address & map" },
  { id: 2, title: "Cameras", sub: "Type, height & footage" },
  { id: 3, title: "Slots & pricing", sub: "Mark each space" },
];

/** What has reached the API, so a retry continues where the last attempt stopped. */
interface Progress {
  lotId: string | null;
  /** vehicle types whose lot rate is saved */
  ratesSaved: string[];
  /** draft camera key → camera id, for cameras already saved with their slots */
  cameraIds: Record<string, string>;
  photosDone: boolean;
}

type Stage = "lot" | "rates" | "cameras" | "photos";

const STAGE_LABEL: Record<Stage, string> = {
  lot: "the lot",
  rates: "the hourly rates",
  cameras: "the cameras and slots",
  photos: "the photos",
};

const NO_PROGRESS: Progress = { lotId: null, ratesSaved: [], cameraIds: {}, photosDone: false };

export default function RegisterParkingPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [reached, setReached] = useState<WizardStep>(1);
  const [form, setForm] = useState<LotForm>(EMPTY_FORM);
  const cams = useDraftCameras();
  const [rates, setRates] = useState<VehicleRates>(defaultVehicleRates);
  const [photos, setPhotos] = useState<File[]>([]);
  const [activeCamera, setActiveCamera] = useState(0);
  /** the check whose failure the footer shows; its message updates as the owner fixes it */
  const [check, setCheck] = useState<{ step: WizardStep } | { camera: string } | null>(null);
  const [error, setError] = useState<{ text: string; photosLink: boolean } | null>(null);
  const [progress, setProgress] = useState<Progress>(NO_PROGRESS);
  const [submitting, setSubmitting] = useState(false);

  const locked = !!progress.lotId;
  const cameraCount = cams.cameras.length;
  const cameraIndex = Math.min(activeCamera, Math.max(cameraCount - 1, 0));
  const lastCamera = cameraIndex >= cameraCount - 1;

  function update(patch: LotFormPatch) {
    setForm((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
    setCheck(null);
  }

  /** Steps can be revisited freely; moving past one needs it (and those before it) valid. */
  function goTo(target: WizardStep) {
    for (let s = 1 as WizardStep; s < target; s = (s + 1) as WizardStep) {
      if (stepError(s, form, cams.cameras, rates)) {
        setStep(s);
        setCheck({ step: s });
        return;
      }
    }
    setCheck(null);
    setStep(target);
    setReached((prev) => (target > prev ? target : prev));
  }

  function next() {
    if (step < 3) {
      goTo((step + 1) as WizardStep);
      return;
    }
    if (!lastCamera) {
      const camera = cams.cameras[cameraIndex];
      if (cameraSlotProblem(camera)) {
        setCheck({ camera: camera.key });
      } else {
        setCheck(null);
        setActiveCamera(cameraIndex + 1);
      }
      return;
    }
    void submit();
  }

  function back() {
    setCheck(null);
    if (step === 3 && cameraIndex > 0) setActiveCamera(cameraIndex - 1);
    else if (step > 1) setStep((step - 1) as WizardStep);
  }

  async function submit() {
    for (const s of [1, 2, 3] as WizardStep[]) {
      if (stepError(s, form, cams.cameras, rates)) {
        setStep(s);
        setCheck({ step: s });
        // show the camera that still needs slots
        const empty = cams.cameras.findIndex((c) => cameraSlotProblem(c));
        if (s === 3 && empty >= 0) setActiveCamera(empty);
        return;
      }
    }
    const location = pickedLocation(form)!;
    setCheck(null);
    setError(null);
    setSubmitting(true);

    let p = progress;
    let stage: Stage = "lot";
    const save = (nextProgress: Progress) => {
      p = nextProgress;
      setProgress(nextProgress);
    };

    try {
      if (!p.lotId) {
        const created = await parkingSpacesRepository.create(
          buildCreateInput(
            {
              ...form,
              contact_phone: form.contact_phone.trim() ? normalizeBangladeshPhone(form.contact_phone) : "",
              latitude: location.lat,
              longitude: location.lng,
            },
            cams.cameras,
            rates,
          ),
        );
        if (!created.id) throw new ParkingSpaceError("The API created the lot but did not return its id.");
        save({ ...p, lotId: created.id });
      }
      const lotId = p.lotId!;

      // the lot's rate per vehicle type first: a slot without its own price needs it
      stage = "rates";
      for (const rate of buildVehicleRates(cams.cameras, rates)) {
        if (p.ratesSaved.includes(rate.vehicle_type)) continue;
        await parkingSpacesRepository.setVehicleRate(lotId, rate.vehicle_type, rate.hourly_rate_unit);
        save({ ...p, ratesSaved: [...p.ratesSaved, rate.vehicle_type] });
      }

      // one request per camera; each saves the camera and its slots together.
      // The footage itself stays in this browser: the API has no upload for it.
      stage = "cameras";
      for (const camera of cams.cameras) {
        if (p.cameraIds[camera.key]) continue;
        const input = buildCameraInput(camera);
        if (!input) throw new ParkingSpaceError(`${camera.label}: add footage or a snapshot so its slots can be marked.`);
        const created = await parkingSpacesRepository.createCamera(lotId, input);
        save({ ...p, cameraIds: { ...p.cameraIds, [camera.key]: created.id } });
      }

      stage = "photos";
      if (photos.length && !p.photosDone) {
        await parkingSpacesRepository.addPhotos(lotId, photos);
        save({ ...p, photosDone: true });
      }

      router.push("/owner?registered=1");
    } catch (caught) {
      const message = caught instanceof ParkingSpaceError ? caught.message : `Could not save ${STAGE_LABEL[stage]}.`;
      setError({
        text: p.lotId ? `Your lot was created, but saving ${STAGE_LABEL[stage]} failed: ${message}` : message,
        photosLink: !!p.lotId && stage === "photos",
      });
      setSubmitting(false);
    }
  }

  const checkedCamera = check && "camera" in check ? cams.cameras.find((c) => c.key === check.camera) : undefined;
  const stepProblem = !check
    ? null
    : "step" in check
      ? stepError(check.step, form, cams.cameras, rates)
      : checkedCamera
        ? cameraSlotProblem(checkedCamera)
        : null;

  const footerHint =
    step === 3
      ? `Camera ${cameraIndex + 1} of ${cameraCount} · ${cams.cameras.reduce((n, c) => n + c.slots.length, 0)} slots in total`
      : `Step ${step} of 3`;

  return (
    <OwnerShell active="register" breadcrumb="Register parking lot" lockViewport>
      <div className="mx-auto flex w-full max-w-[1400px] flex-col lg:min-h-0 lg:flex-1">
        {/* title + stepper */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Register a parking lot</h1>
            <p className="text-[13px] text-muted-foreground">
              Three short steps: the lot, its cameras, then the parking slots each camera sees.
            </p>
          </div>
          <ol className="grid grid-cols-3 gap-1.5 sm:gap-2 xl:w-[620px]">
            {STEPS.map((s) => {
              const done = s.id < step || (locked && s.id <= 3);
              const current = s.id === step;
              const reachable = s.id <= reached && !submitting;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!reachable}
                    aria-current={current ? "step" : undefined}
                    onClick={() => goTo(s.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors disabled:cursor-default",
                      current
                        ? "border-brand/60 bg-brand/10"
                        : reachable
                          ? "border-border bg-card hover:border-brand/40"
                          : "border-border bg-card opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                        current || done ? "bg-brand text-[#0b1322]" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {done && !current ? <Check className="size-4" /> : s.id}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold">{s.title}</span>
                      <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{s.sub}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        {error && (
          <Alert variant="destructive" className="mt-3 py-2.5">
            <AlertDescription>
              {error.text}
              {error.photosLink && progress.lotId && (
                <>
                  {" "}
                  <Link href={`/owner/settings?lot=${progress.lotId}#photos`} className="font-semibold underline">
                    Manage photos in Settings
                  </Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* step body + footer */}
        <section className="mt-3 flex flex-col rounded-2xl border border-border bg-card lg:min-h-0 lg:flex-1">
          <div className="p-4 sm:p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {step === 1 && <DetailsStep form={form} update={update} locked={locked} />}
            {step === 2 && (
              <CamerasStep
                form={form}
                update={update}
                cams={cams}
                photos={photos}
                setPhotos={setPhotos}
                locked={locked}
              />
            )}
            {step === 3 && (
              <SlotsStep
                cams={cams}
                rates={rates}
                setRates={setRates}
                activeIndex={cameraIndex}
                setActiveIndex={setActiveCamera}
                locked={locked}
              />
            )}
          </div>

          <footer className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5">
            <Button type="button" variant="outline" onClick={back} disabled={(step === 1) || submitting}>
              <ArrowLeft className="size-4" />
              {step === 3 && cameraIndex > 0 ? "Previous camera" : "Back"}
            </Button>
            <p
              aria-live="polite"
              className={cn(
                "order-last w-full text-[13px] sm:order-none sm:w-auto sm:flex-1",
                stepProblem ? "font-semibold text-destructive" : "text-muted-foreground",
              )}
            >
              {stepProblem ?? footerHint}
            </p>
            <Button type="button" variant="brand" onClick={next} disabled={submitting} className="ml-auto sm:ml-0">
              {step < 3 ? (
                <>
                  Continue
                  <ArrowRight className="size-4" />
                </>
              ) : !lastCamera ? (
                <>
                  Next camera
                  <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {submitting ? "Registering…" : locked ? "Retry saving" : "Register parking lot"}
                </>
              )}
            </Button>
          </footer>
        </section>
      </div>
    </OwnerShell>
  );
}
