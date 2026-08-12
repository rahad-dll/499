"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Building2,
  CircleDollarSign,
  Layers,
  Link2,
  MapPin,
  Navigation,
  Phone,
  Save,
} from "lucide-react";
import { OwnerShell } from "@/components/portal/OwnerShell";
import { TextField } from "@/components/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ParkingSpaceError,
  parkingSpacesRepository,
} from "@/lib/spaces/repository";
import type { SpaceType } from "@/lib/spaces/types";

export default function RegisterParkingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [spaceType, setSpaceType] = useState<SpaceType>("outdoor");
  const [capacity, setCapacity] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const parsedCapacity = Number(capacity);
    const parsedRate = hourlyRate ? Math.round(Number(hourlyRate) * 100) : undefined;

    if (!name.trim() || !Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      setError("Facility name, latitude, and longitude are required.");
      return;
    }
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError("Total capacity must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      await parkingSpacesRepository.create({
        name: name.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        space_type: spaceType,
        total_capacity: parsedCapacity,
        base_rate_unit: parsedRate,
        rtsp_url: rtspUrl.trim() || undefined,
      });
      router.push("/owner?registered=1");
    } catch (caught) {
      setError(
        caught instanceof ParkingSpaceError
          ? caught.message
          : "Could not register parking lot",
      );
      setSubmitting(false);
    }
  }

  return (
    <OwnerShell active="register" breadcrumb="Register Parking Lot">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
          Register a Parking Lot
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a facility to CityPulse using the live parking API.
        </p>

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-7"
        >
          <div className="grid gap-x-6 sm:grid-cols-2">
            <TextField
              label="Facility Name"
              name="name"
              icon={Building2}
              placeholder="Gulshan Parking Zone A"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <TextField
              label="Contact Number"
              name="contact_phone"
              type="tel"
              icon={Phone}
              placeholder="01712345678"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <TextField
              label="Address"
              name="address"
              icon={MapPin}
              placeholder="House 12, Road 5, Gulshan"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
            <TextField
              label="Total Capacity"
              name="total_capacity"
              type="number"
              min="1"
              max="10000"
              icon={Layers}
              placeholder="50"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              required
            />
            <TextField
              label="Latitude"
              name="latitude"
              type="number"
              step="any"
              min="-90"
              max="90"
              icon={Navigation}
              placeholder="23.7937"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              required
            />
            <TextField
              label="Longitude"
              name="longitude"
              type="number"
              step="any"
              min="-180"
              max="180"
              icon={Navigation}
              placeholder="90.4066"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              required
            />

            <div className="mt-5">
              <Label htmlFor="space_type" className="mb-2 block">
                Parking Type
              </Label>
              <select
                id="space_type"
                name="space_type"
                value={spaceType}
                onChange={(event) => setSpaceType(event.target.value as SpaceType)}
                className="h-[50px] w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor</option>
                <option value="rooftop">Rooftop</option>
              </select>
            </div>

            <TextField
              label="Hourly Rate (BDT)"
              name="hourly_rate"
              type="number"
              min="0"
              step="0.01"
              icon={CircleDollarSign}
              placeholder="50"
              value={hourlyRate}
              onChange={(event) => setHourlyRate(event.target.value)}
            />
            <TextField
              label="RTSP Camera URL"
              name="rtsp_url"
              icon={Link2}
              placeholder="rtsp://192.168.1.100:554/stream1"
              value={rtspUrl}
              onChange={(event) => setRtspUrl(event.target.value)}
              className="sm:col-span-2"
            />
          </div>

          <div className="mt-5">
            <Label htmlFor="description" className="mb-2 block">
              Description
            </Label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Covered parking near Gulshan-1 circle"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-y rounded-md border border-input bg-background px-3 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
          </div>

          <div className="mt-7 flex justify-end">
            <Button type="submit" variant="brand" size="lg" disabled={submitting}>
              <Save className="size-4" />
              {submitting ? "Registering…" : "Register Parking Lot"}
            </Button>
          </div>
        </form>
      </div>
    </OwnerShell>
  );
}
