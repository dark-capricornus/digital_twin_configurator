# Configurator Sprint Plan

**Cadence:** 2-week sprints  

## Sprint 0 — Lock the Foundation

**Move:** Define exactly what the configurator creates.

- Agree on the first target: Alloy Wheel Manufacturing.
- Define the first asset: `FURNACE_01`.
- Define the first live fields: temperature, state, power, vibration.
- Create the `TwinConfiguration`, `AssetTemplate`, `DataSource`, and `DataBinding` schemas.
- Freeze one canonical live-data message format.

**Output:** One valid configuration JSON for a furnace, even before UI work starts.

**Done when:** Both developers can create/read the same furnace configuration without ambiguity.

## Sprint 1 — Build the Asset Library

**Move:** Make reusable asset templates available inside the configurator.

- Add an Asset Library panel.
- Add a Furnace template.
- Include default metadata fields, telemetry fields, visual states, alarms, and mapping hints.
- Allow the user to drag a Furnace into the scene.
- Save configured asset instances locally.

**Output:** A user can create `FURNACE_01` from a reusable Furnace template.

**Done when:** The configurator creates a furnace with its required fields without manually adding every property.

## Sprint 2 — Connect Assets to the 3D Model

**Move:** Link configured assets with plant-model meshes.

- Import the existing factory GLB.
- Show its mesh/object hierarchy.
- Let the user select a mesh and attach it to an asset.
- Show the selected furnace mesh in the asset inspector.
- Add visual states: Running, Idle, Fault, Offline.

**Output:** `FURNACE_01` is connected to the correct 3D object.

**Done when:** Changing a test status changes the furnace mesh colour in the configurator.

## Sprint 3 — Add Data Sources and Mapping

**Move:** Let users connect and map live data without code.

- Add “Data Sources” section.
- Implement the existing simulator/WebSocket source first.
- Read and display available PLC/simulator tags.
- Build the mapping screen: asset property → source tag.
- Show live sample value, unit, timestamp, and mapping health.
- Save mappings into the twin configuration.

**Output:** Furnace temperature, state, power, and vibration are mapped to simulator tags.

**Done when:** A user can configure all four mappings through the UI and test them successfully.

## Sprint 4 — Run the Twin from the Configurator

**Move:** Make the configured furnace live.

- Build the runtime adapter between configurator and existing Python bridge.
- Normalize WebSocket data into the platform’s canonical format.
- Update 3D visual state from live data.
- Show live values in the Inspector panel.
- Add safe read-only live mode.

**Output:** The configurator shows real-time simulated furnace behaviour.

**Done when:** Start the existing simulator, open the configurator, and see live furnace values and status without using the old dashboard.

## Sprint 5 — Publish and Recreate the Factory

**Move:** Prove the configurator can build a twin, not merely edit a scene.

- Add publish/export of a versioned twin configuration package.
- Import that package into the runtime adapter.
- Add templates for CNC, LPDC, cooling, inspection, and paint.
- Configure the first manufacturing zone through the UI.
- Compare live behaviour against the existing manufacturing dashboard.

**Output:** A deployable Alloy Wheel Manufacturing Pack.

**Done when:** The team can recreate at least one working factory zone from configuration alone.

## Sprint 6 — History, Rules, and Prediction Preparation

**Move:** Turn live data into useful operational data.

- Store mapped telemetry historically.
- Add charts and alarm history for the furnace.
- Add simple threshold rules: warning and critical limits.
- Add data-quality checks: stale, missing, invalid, or out-of-range values.
- Prepare the dataset for anomaly detection.

**Output:** Furnace telemetry history and operational alerts.

**Done when:** A user can view a furnace trend, identify an alarm, and see why it occurred.

## Sprint 7 — Prediction MVP

**Move:** Add one explainable predictive feature.

- Build furnace anomaly detection using temperature, power, state, and vibration.
- Show risk level, confidence, and contributing signals.
- Store model version and prediction timestamp.
- Keep all recommendations human-approved.

**Output:** Furnace anomaly alert in the configurator.

**Done when:** A simulated abnormal furnace condition produces an understandable prediction and recommended action.

## Working Rules

- Do not add another industry before Sprint 5 succeeds.
- Do not add a prediction model before Sprint 6 produces reliable historical data.
- Keep the existing manufacturing twin as the simulator and reference benchmark.
- Demo every sprint on Friday.
- If a sprint is incomplete, finish it before starting the next major feature.