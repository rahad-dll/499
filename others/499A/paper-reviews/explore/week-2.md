# Sprint 2 Explore — Week 2

---

## Geospatial Queries (PostGIS)

- PostGIS extends PostgreSQL to handle GPS-based location queries properly.
- `ST_DWithin` filters spaces within a given radius using a spatial index — fast.
- `<->` operator sorts results by nearest first, also index-assisted.
- A GiST index on the location column is required for both to work efficiently.
- Plain `ST_Distance` without filtering scans the whole table — avoid it alone.

**Real example:** Uber and Waze use geospatial radius queries to find nearby drivers or show nearby traffic. Same principle — given a GPS point, return ranked results within a radius.

**Used in CityPulse:** nearby parking search — filter by radius, sort by distance, enrich with live slot count from Redis.

**Sources**
- [PostGIS ST_DWithin](https://www.postgis.net/docs/ST_DWithin.html)
- [KNN <-> operator](https://postgis.net/docs/manual-2.2/geometry_distance_knn.html)
- [Radius search design guide](https://azureblue.io/designing-a-radius-based-proximity-search-with-postgres-postgis)

---

## WebSocket Patterns (NestJS)

- WebSocket keeps a persistent connection so the server can push updates without a client request.
- NestJS uses `@WebSocketGateway` wrapping Socket.IO for this.
- **Rooms** group clients by parking lot — the server pushes to a room only, not to everyone.
- FastAPI publishes slot events to Redis Pub/Sub → NestJS subscribes → forwards to lot room → driver map updates.

**Real example:** Live cricket score apps (Cricbuzz, ESPN Cricinfo) push ball-by-ball updates to users watching a match — same room-based push pattern. Slack and Discord use the same approach for channel-based messaging.

**Used in CityPulse:** real-time slot availability updates on driver map and owner portal.

**Sources**
- [NestJS WebSocket Docs](https://docs.nestjs.com/websockets/adapter)
- [NestJS Rooms Guide](https://dev.to/delightfulengineering/nest-js-websockets-rooms-5hkd)
- [NestJS + Socket.IO Rooms (StackOverflow)](https://stackoverflow.com/questions/64470937/joining-and-emitting-to-rooms-with-socket-io-in-nestjs)

---

## RTSP Stream Ingestion (OpenCV)

- IP cameras (Hikvision, Dahua, Axis — common in Dhaka) stream video over RTSP.
- OpenCV connects with `cv2.VideoCapture("rtsp://192.168.1.10:554/stream")`.
- **Buffer lag problem:** OpenCV buffers incoming frames. If inference is slow, the system processes old footage — sometimes minutes behind real time.
- **Fix:** two threads — one reads frames continuously to keep buffer clear, one runs inference on the latest frame only.
- One worker per camera — a dead camera does not block others.
- Sampling every 2–3 seconds is enough for parking detection; no need to process 25 fps.

**Real example:** Roboflow and NVIDIA DeepStream both use this producer-consumer threading pattern for production RTSP pipelines. Traffic enforcement cameras at Dhaka intersections (deployed by DNCC in 2025) use the same RTSP-based ingestion approach.

**Used in CityPulse:** FastAPI spawns one RTSP worker per registered camera, samples every 2–3 seconds, runs YOLOv8 on slot patches.

**Sources**
- [Roboflow — RTSP for Real-Time Analytics](https://blog.roboflow.com/process-rtsp-streams/)
- [Threaded frame capture fix (StackOverflow)](https://stackoverflow.com/a/30032945)
- [YOLO + RTSP Python example](https://github.com/foschmitz/yolo-python-rtsp)
- [OpenCV RTSP buffer lag discussion](https://stackoverflow.com/questions/60816436/open-cv-rtsp-camera-buffer-lag)

---

**Prepared:** Sprint 2, Week 2 — 2026-07-08
