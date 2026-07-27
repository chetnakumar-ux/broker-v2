import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { create } from "zustand";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

import StepSidebar from "./StepSidebar";

import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";

const STOP_TYPES = [
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
];

const COUNTRIES = ["United States", "Canada", "Mexico", "India"];

const TIMEZONES = [
  "(UTC-07:00) Arizona",
  "(UTC-05:00) Eastern",
  "(UTC-06:00) Central",
  "(UTC-08:00) Pacific",
  "(UTC+05:30) India",
];

const EVENT_DEFS = [
  { key: "arrived", label: "Arrived" },
  { key: "checkedIn", label: "Checked-in" },
  { key: "pickup", label: "Pickup", hasNote: true, notePlaceholder: "trailer# 123 or load# 123" },
  { key: "departed", label: "Departed" },
];

const EMAIL_LIST_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*(,\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*)*$/;

const blankEvents = () => ({
  arrived: { add: true, required: false },
  checkedIn: { add: false, required: false },
  pickup: { add: true, required: true, note: "" },
  departed: { add: false, required: false },
});

const blankStop = (stopType = "pickup") => ({
  stopType,
  stopName: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  zipcode: "",
  country: "",
  latitude: null,
  longitude: null,

  startDate: "",
  startTime: "",
  startTimezone: "",
  endDate: "",
  endTime: "",
  endTimezone: "",

  commentToDriver: "",
  alertEmails: "",

  events: blankEvents(),
  customEvents: [],
});

export const BLANK_STEP2_VALUES = {
  stops: [blankStop("pickup"), blankStop("delivery")],
};

const useTripSheetDraftStore = create((set) => ({
  step2: BLANK_STEP2_VALUES,
  setStep2: (values) => set({ step2: values }),
  resetStep2: () => set({ step2: BLANK_STEP2_VALUES }),
}));

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-sans";

const selectClass = inputClass + " appearance-none pr-9";

const FieldLabel = ({ children, required }) => (
  <label className="mb-2 block text-sm font-semibold text-slate-800 font-sans">
    {children}
    {required ? <span className="ml-0.5 text-red-500">*</span> : null}
  </label>
);

const SectionEyebrow = ({ children }) => (
  <p className="mb-4 border-b border-slate-200 pb-2 text-xs font-bold tracking-widest text-blue-600 font-sans">
    {children}
  </p>
);

const ErrorText = ({ children }) =>
  children ? <p className="mt-1.5 text-xs text-red-500 font-sans">{children}</p> : null;

const ChevronDown = () => (
  <KeyboardArrowDownIcon
    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
    fontSize="small"
  />
);

const StopTypeBadge = ({ type }) => (
  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-600 font-sans">
    {type === "delivery" ? "Delivery" : "Pickup"}
  </span>
);

// --- GOOGLE MAPS AUTOCOMPLETE COMPONENT ---
// Automatically updates lat/lng/city/state/zip in react-hook-form
function AddressAutocomplete({ index, setValue, error }) {
  const inputRef = useRef(null);

  useEffect(() => {
    // Ensure Google maps script is loaded in your index.html
    if (!window.google) {
      console.warn("Google Maps JavaScript API is not loaded.");
      return;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["address_components", "geometry", "formatted_address"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry) return;

      // Extract Coordinates
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      // Extract Address Components
      let city = "", state = "", zip = "", country = "";
      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes("locality") || types.includes("sublocality_level_1")) city = component.long_name;
        if (types.includes("administrative_area_level_1")) state = component.short_name;
        if (types.includes("postal_code")) zip = component.long_name;
        if (types.includes("country")) country = component.long_name;
      });

      // Populate react-hook-form instantly
      setValue(`stops.${index}.address`, place.formatted_address, { shouldValidate: true });
      setValue(`stops.${index}.latitude`, lat);
      setValue(`stops.${index}.longitude`, lng);
      if (city) setValue(`stops.${index}.city`, city);
      if (state) setValue(`stops.${index}.state`, state);
      if (zip) setValue(`stops.${index}.zipcode`, zip);
      if (country) setValue(`stops.${index}.country`, country);
    });

    return () => {
      if (window.google) window.google.maps.event.removeListener(listener);
    };
  }, [index, setValue]);

  return (
    <div>
      <input
        ref={inputRef}
        className={inputClass}
        placeholder="Search and select address..."
        onChange={(e) => setValue(`stops.${index}.address`, e.target.value)}
      />
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

// Builds the specific JSON structure your backend expects
function buildTripSheetPayload(stops) {
  return stops.map((stop) => ({
    stop_type: stop.stopType === "pickup" ? "Pickup" : "Delivery",
    stop_name: stop.stopName,
    address: stop.address,
    address_2: stop.address2 || "",
    city: stop.city || "",
    state: stop.state || "",
    zipcode: stop.zipcode || "",
    country: stop.country || "",
    latitude: stop.latitude,
    longitude: stop.longitude,

    start_date: stop.startDate || "",
    start_time: stop.startTime || "",
    start_timezone: stop.startTimezone ? stop.startTimezone.split(') ')[1] : "", // Extracts 'Pacific' from '(UTC-08:00) Pacific'
    end_date: stop.endDate || "",
    end_time: stop.endTime || "",
    end_timezone: stop.endTimezone ? stop.endTimezone.split(') ')[1] : "",

    comment_to_driver: stop.commentToDriver || "",
    alert_emails: stop.alertEmails || "",

    custom_events: (stop.customEvents || [])
      .filter((ce) => ce.add)
      .map((ce) => ({
        customEventName: ce.label || "Custom event",
        type: ce.type || "text", // Default to text unless file is handled
        value: ce.value || ""
      })),
  }));
}

function CustomEventRow({ stopIndex, ceIndex, control, register, remove }) {
  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3">
        <Controller
          control={control}
          name={`stops.${stopIndex}.customEvents.${ceIndex}.add`}
          render={({ field: { value, onChange } }) => (
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          )}
        />
        <input
          className={inputClass}
          placeholder="Custom event name"
          {...register(`stops.${stopIndex}.customEvents.${ceIndex}.label`)}
        />
        <Controller
          control={control}
          name={`stops.${stopIndex}.customEvents.${ceIndex}.required`}
          render={({ field: { value, onChange } }) => (
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 justify-self-end rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          )}
        />
        <IconButton size="small" onClick={() => remove(ceIndex)} aria-label="Remove custom event" sx={{ color: "#94a3b8" }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
}

function StopCard({ index, control, register, errors, setValue, remove, canRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  const {
    fields: customEventFields,
    append: appendCustomEvent,
    remove: removeCustomEvent,
  } = useFieldArray({ control, name: `stops.${index}.customEvents` });

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#112963] text-sm font-bold text-white">
            {index + 1}
          </span>
          <Controller
            control={control}
            name={`stops.${index}.stopType`}
            render={({ field: { value } }) => (
              <p className="text-sm font-bold text-slate-800">
                Stop {index + 1} · {STOP_TYPES.find((t) => t.value === value)?.label || "Pickup"}
              </p>
            )}
          />
          <Controller
            control={control}
            name={`stops.${index}.stopType`}
            render={({ field: { value } }) => <StopTypeBadge type={value} />}
          />
        </div>

        <div className="flex items-center gap-2">
          {canRemove ? (
            <IconButton
              size="small"
              onClick={() => {
                remove(index);
                toast.success({ title: "Stop removed", duration: 2500 });
              }}
              sx={{ color: "#94a3b8", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "6px" }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          ) : null}
          <IconButton
            size="small"
            onClick={() => setCollapsed((v) => !v)}
            sx={{
              color: "#94a3b8",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "6px",
              transform: collapsed ? "rotate(-90deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-2">
          <div>
            <SectionEyebrow>Location</SectionEyebrow>

            <div className="mb-5">
              <FieldLabel>Stop Type</FieldLabel>
              <div className="relative">
                <select className={selectClass} {...register(`stops.${index}.stopType`)}>
                  {STOP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>

            <div className="mb-5">
              <FieldLabel>Stop Name</FieldLabel>
              <input className={inputClass} placeholder="Enter stop name" {...register(`stops.${index}.stopName`)} />
            </div>

            <div className="mb-5">
              <FieldLabel required>Address</FieldLabel>
              {/* Custom Google Places Component injected here */}
              <AddressAutocomplete 
                index={index} 
                setValue={setValue} 
                error={errors?.stops?.[index]?.address?.message} 
              />
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-slate-800 font-sans">
                Address 2 <span className="font-normal text-slate-400">optional</span>
              </label>
              <input className={inputClass} placeholder="Enter address 2" {...register(`stops.${index}.address2`)} />
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>City</FieldLabel>
                <input className={inputClass} placeholder="City" {...register(`stops.${index}.city`)} />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <input className={inputClass} placeholder="State" {...register(`stops.${index}.state`)} />
              </div>
              <div>
                <FieldLabel>Zipcode</FieldLabel>
                <input className={inputClass} placeholder="Zip" {...register(`stops.${index}.zipcode`)} />
              </div>
            </div>

            <div className="mb-8">
              <FieldLabel>Country</FieldLabel>
              <div className="relative">
                <select className={selectClass} {...register(`stops.${index}.country`)} defaultValue="">
                  <option value="" disabled>Select country</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>

            <SectionEyebrow>Timing</SectionEyebrow>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel required>Start — Date</FieldLabel>
                <input
                  className={inputClass}
                  type="date"
                  {...register(`stops.${index}.startDate`, { required: "Start date is required" })}
                />
                <ErrorText>{errors?.stops?.[index]?.startDate?.message}</ErrorText>
              </div>
              <div>
                <FieldLabel>Time</FieldLabel>
                <input className={inputClass} type="time" {...register(`stops.${index}.startTime`)} />
              </div>
              <div>
                <FieldLabel>Timezone</FieldLabel>
                <div className="relative">
                  <select className={selectClass} {...register(`stops.${index}.startTimezone`)} defaultValue="">
                    <option value="" disabled>Select timezone</option>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <ChevronDown />
                </div>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>End — Date</FieldLabel>
                <input className={inputClass} type="date" {...register(`stops.${index}.endDate`)} />
              </div>
              <div>
                <FieldLabel>Time</FieldLabel>
                <input className={inputClass} type="time" {...register(`stops.${index}.endTime`)} />
              </div>
              <div>
                <FieldLabel>Timezone</FieldLabel>
                <div className="relative">
                  <select className={selectClass} {...register(`stops.${index}.endTimezone`)} defaultValue="">
                    <option value="" disabled>Select timezone</option>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <ChevronDown />
                </div>
              </div>
            </div>

            <SectionEyebrow>Driver Comms</SectionEyebrow>
            <div className="mb-5">
              <FieldLabel>Comment to Driver</FieldLabel>
              <textarea
                rows={3}
                className={inputClass + " resize-y"}
                placeholder="Type your message"
                {...register(`stops.${index}.commentToDriver`)}
              />
            </div>
            <div>
              <FieldLabel>Alert Emails</FieldLabel>
              <input
                className={inputClass}
                placeholder="Enter email(s)"
                {...register(`stops.${index}.alertEmails`, {
                  validate: (v) => v === "" || EMAIL_LIST_PATTERN.test(v) || "Enter one or more valid emails",
                })}
              />
              <ErrorText>{errors?.stops?.[index]?.alertEmails?.message}</ErrorText>
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
              <p className="text-xs font-bold tracking-widest text-blue-600 font-sans">EVENTS AT LOCATION</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 font-sans">
                <span>Add</span>
                <span>Event</span>
                <span className="text-right">Required by driver</span>
              </div>

              {customEventFields.map((ce, ceIndex) => (
                <CustomEventRow
                  key={ce.id}
                  stopIndex={index}
                  ceIndex={ceIndex}
                  control={control}
                  register={register}
                  remove={removeCustomEvent}
                />
              ))}

              <div className="border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => appendCustomEvent({ label: "", add: true, required: false, type: "text" })}
                  className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 font-sans"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50">
                    <AddIcon sx={{ fontSize: 14 }} />
                  </span>
                  Add custom event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackShipmentStep2() {
  const navigate = useNavigate();
  const step2Draft = useTripSheetDraftStore((s) => s.step2);
  const setStep2Draft = useTripSheetDraftStore((s) => s.setStep2);
  const resetStep2Draft = useTripSheetDraftStore((s) => s.resetStep2);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm({
    mode: "onBlur",
    defaultValues: step2Draft,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "stops" });

  useEffect(() => {
    const subscription = watch((values) => setStep2Draft(values));
    return () => subscription.unsubscribe();
  }, [watch, setStep2Draft]);

  const onInvalid = () => {
    toast.error({ title: "Missing information", message: "Please check the highlighted fields." });
  };

  const onSubmit = (data) => {
    const shipmentUuid = localStorage.getItem("current_shipment_uuid");

    if (!shipmentUuid) {
      toast.error({ title: "Shipment UUID not found. Please complete step 1." });
      return;
    }

    const stopsPayload = buildTripSheetPayload(data.stops);

    const formData = new FormData();
    formData.append("stops_data", JSON.stringify(stopsPayload));

    apiFetch(`/shipments/${shipmentUuid}/stops`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        toast.success({ title: "Stops saved successfully!", duration: 2500 });
        resetStep2Draft();
        navigate("/trackshipment/step3");
      })
      .catch((err) => {
        toast.error({ title: "Failed to save trip sheet" });
      });
  };

  return (
    <div className="flex min-h-screen bg-[#EBF1FC] font-sans">
      <StepSidebar currentStep={2} />
      <div className="flex-1 px-8 py-10 md:px-14">
        <div className="mb-4 border-b border-[#E2EAF4] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#93A7CD]">STEP 2</p>
          <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-[#112963]">Trip Sheet</h1>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#7085A8]">
            Add each stop on the route. Search addresses below to automatically get coordinates.
          </p>
        </div>

        <div className="max-w-5xl">
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="pb-28">
            {fields.map((field, index) => (
              <StopCard
                key={field.id}
                index={index}
                control={control}
                register={register}
                errors={errors}
                setValue={setValue} // Passing setValue down so Autocomplete can update forms
                remove={remove}
                canRemove={fields.length > 1}
              />
            ))}

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => append(blankStop(fields.length % 2 === 0 ? "pickup" : "delivery"))}
                className="group inline-flex items-center gap-2.5 rounded-xl border border-dashed border-[#B8CCF8] bg-white px-6 py-3 transition-all duration-200 hover:border-[#2F5CFB] hover:bg-[#F8FBFF]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF4FF] group-hover:bg-[#DCE9FF]">
                  <AddIcon sx={{ fontSize: 18, color: "#2F5CFB" }} />
                </span>
                <span className="text-base font-bold text-[#112963] font-sans">Add another stop</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-8 py-4 backdrop-blur md:px-14 font-sans">
        <div className="ml-0 flex max-w-6xl items-center justify-between md:ml-[280px]">
          <span className="text-sm font-semibold text-slate-500 font-sans">
            {fields.length} stop{fields.length === 1 ? "" : "s"} on this route
          </span>

          <div className="flex items-center gap-3">
            {/* <button
              type="button"
              onClick={() => navigate("/trackshipment/step1")}
              className="rounded-xl border border-slate-200 px-6 py-4 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              ← Back
            </button> */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit, onInvalid)}
              className="rounded-xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Continue to Schedule Alerts →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}