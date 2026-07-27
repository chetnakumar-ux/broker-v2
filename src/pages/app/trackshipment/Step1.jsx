import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { create } from "zustand";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

import StepSidebar from "./StepSidebar";

import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SearchIcon from "@mui/icons-material/Search";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";



const TRACKING_METHODS = [
  { value: "driver_phone", label: "Driver's Cell Phone" },
  { value: "eld", label: "ELD / Telematics" },
  { value: "gps", label: "Trailer GPS" },
];

const DRIVER_TYPES = [
  { value: "company_driver", label: "Your company driver" },
  { value: "leased_owner_operator", label: "Owner operator (leased)" },
  { value: "independent_owner_operator", label: "Owner operator (independent)" },
  { value: "other_company_driver", label: "Other carrier company driver" },
];

const COUNTRY_CODES = [
  { code: "IN", dial: "+91", label: "India" },
  { code: "US", dial: "+1", label: "United States" },
  { code: "CA", dial: "+1", label: "Canada" },
  { code: "MX", dial: "+52", label: "Mexico" },
];

const TRACK_DURATIONS = [
  { value: "track for 1 day", label: "Track for 1 day" },
  { value: "track for 2 days", label: "Track for 2 days" },
  { value: "track for 3 days", label: "Track for 3 days" },
  { value: "track for 1 week", label: "Track for 1 week" },
];

const INTERVALS = [
  { value: "every 15 minutes", label: "Every 15 minutes" },
  { value: "every 30 minutes", label: "Every 30 minutes" },
  { value: "every 1 hour", label: "Every 1 hour" },
  { value: "every 2 hour", label: "Every 2 hours" },
];

const PHONE_PATTERN = /^[0-9()+\-\s]{7,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_LIST_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*(,\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*)*$/;

const CARRIER_LIST_URL = "/getCarrier";

// NEW: template listing + per-template fetch endpoints
const TEMPLATE_LIST_URL = "/shipment-templates";
const templateDetailUrl = (trackingNumber) =>
  `/shipment-templates/${encodeURIComponent(trackingNumber)}`;

export const BLANK_STEP1_VALUES = {
  reuseTemplate: "scratch",

  proNumber: "",

  carrierName: "",
  carrierMc: "",
  carrierDot: "",
  carrierPhone: "",
  carrierExtension: "",

  trackingMethod: "driver_phone",
  countryCode: "US",
  trackingNumber: "",

  truckNumber: "",
  trailerNumber: "",

  driverPhone1: "",
  driverPhone2: "",
  driverType: "owner_operator_leased",

  teamLoad: false,

  dispatcherName: "",
  dispatcherEmail: "",

  updates: [
    { date: "", time: "", duration: "", interval: "" },
  ],
  emailUpdatesTo: "",

  notes: "",
  saveAsTemplate: false,
};

const useShipmentDraftStore = create((set) => ({
  step1: BLANK_STEP1_VALUES,
  setStep1: (values) => set({ step1: values }),
  resetStep1: () => set({ step1: BLANK_STEP1_VALUES }),

  lastCreatedShipment: null,
  setLastCreatedShipment: (shipment) => set({ lastCreatedShipment: shipment }),
}));

const onInvalid = () => {
  toast.error({
    title: "Missing information",
    message: "Please check the highlighted fields and try again.",
  });
};

function useCarrierOptions() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiFetch(CARRIER_LIST_URL, { method: "GET" })
      .then((data) => {
        if (cancelled) return;
        // Be defensive about the response shape: plain array, or wrapped in
        // { data: [...] } / { records: [...] }
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.records)
          ? data.records
          : [];
        setCarriers(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return [carriers, loading];
}

function useApiOptions(endpoint) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiFetch(endpoint)
      .then((data) => {
        if (cancelled) return;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.data)
          ? data.data
          : [];
        setOptions(list);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return [options, setOptions, loading];
}

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

const CountryFlag = ({ code, className = "" }) => (
  <img
    src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
    srcSet={`https://flagcdn.com/48x36/${code.toLowerCase()}.png 2x`}
    width={20}
    height={15}
    alt=""
    className={`inline-block shrink-0 rounded-[2px] object-cover ${className}`}
  />
);

const CarrierStatusBadge = ({ carrier }) => {
  if (!carrier) return null;
  const verified = !!carrier.stripe_verified_at;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold font-sans ${
        verified ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${verified ? "bg-green-500" : "bg-yellow-400"}`} />
      {verified ? "Stripe Verified" : "Pending Verification"}
    </span>
  );
};

const FieldLabel = ({ children, required }) => (
  <label className="mb-2 block text-sm font-semibold text-slate-800 font-sans">
    {children}
    {required ? <span className="ml-0.5 text-red-500">*</span> : null}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-sans";

const selectClass = inputClass + " appearance-none pr-9";

const SectionHeading = ({ children }) => (
  <h3 className="mb-4 border-b border-slate-200 pb-2 text-xs font-bold tracking-widest text-blue-600 font-sans">
    {children}
  </h3>
);

const ErrorText = ({ children }) =>
  children ? <p className="mt-1.5 text-xs text-red-500 font-sans">{children}</p> : null;

const ChevronDown = () => (
  <KeyboardArrowDownIcon
    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
    sx={{ fontSize: 20 }}
  />
);

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  loading = false,
  searchable = false,
  hasError = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const selected = options.find((o) => o.value === value);
  const filtered =
    searchable && query
      ? options.filter((o) => (o.searchText || o.label).toLowerCase().includes(query.toLowerCase()))
      : options;

  const renderContent = (opt) => {
    if (!opt) return null;
    if (typeof opt.render === "function") return opt.render(opt.value === value);
    return opt.label;
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className={
          selectClass +
          ` flex items-center text-left disabled:opacity-60 ${
            hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""
          }`
        }
      >
        {loading ? (
          <span className="text-slate-400">Loading…</span>
        ) : selected ? (
          renderContent(selected)
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>
      <ChevronDown />

      {open && !loading && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
              <SearchIcon sx={{ fontSize: 18 }} className="shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or DOT #…"
                className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400 font-sans"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-slate-400 font-sans">No matches</p>}
            {filtered.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition font-sans ${
                    isSelected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt.render ? opt.render(isSelected) : opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");

function formatDateDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

function CustomDatePicker({ value, onChange, placeholder = "Select date", hasError = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const pick = (day) => {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          inputClass +
          ` flex items-center justify-between text-left ${
            hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""
          }`
        }
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <IconButton size="small" onClick={goPrev} sx={{ color: "#94a3b8" }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <p className="text-sm font-bold text-slate-800 font-sans">{monthLabel}</p>
            <IconButton size="small" onClick={goNext} sx={{ color: "#94a3b8" }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 font-sans">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={`empty_${i}`} />;
              const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = iso === value;
              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => pick(day)}
                  className={`h-8 rounded-lg text-sm font-medium transition font-sans ${
                    isSelected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
function to12Hour(value24) {
  if (!value24) {
    const now = new Date();
    return { hour: ((now.getHours() % 12) || 12), minute: now.getMinutes(), period: now.getHours() >= 12 ? "PM" : "AM" };
  }
  const [h, m] = value24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, minute: m, period };
}

function to24HourString(hour, minute, period) {
  let h = hour % 12;
  if (period === "PM") h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

function CustomTimePicker({ value, onChange, hasError = false }) {
  const { hour, minute, period } = to12Hour(value);

  const commit = (nextHour, nextMinute, nextPeriod) => {
    onChange(to24HourString(nextHour, nextMinute, nextPeriod));
  };

  const bumpHour = (dir) => {
    const next = ((hour - 1 + dir + 12) % 12) + 1;
    commit(next, minute, period);
  };
  const bumpMinute = (dir) => {
    const next = (minute + dir + 60) % 60;
    commit(hour, next, period);
  };
  const togglePeriod = () => commit(hour, minute, period === "AM" ? "PM" : "AM");

  const handleHourInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-2);
    if (raw === "") return;
    let n = parseInt(raw, 10);
    if (n < 1) n = 1;
    if (n > 12) n = 12;
    commit(n, minute, period);
  };

  const handleMinuteInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-2);
    if (raw === "") return;
    let n = parseInt(raw, 10);
    if (n > 59) n = 59;
    commit(hour, n, period);
  };

  const spinnerBtnClass = "flex justify-center text-slate-400 hover:text-blue-600 transition leading-none";
  const segmentClass =
    "w-6 border-none bg-transparent text-center text-sm font-semibold text-slate-800 font-sans outline-none";

  return (
    <div
      className={`flex h-[46px] w-full items-center gap-2 rounded-xl border bg-white px-3 shadow-sm transition ${
        hasError
          ? "border-red-400 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100"
          : "border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
      }`}
    >
      <div className="flex flex-col items-center leading-none">
        <button type="button" className={spinnerBtnClass} onClick={() => bumpHour(1)} tabIndex={-1}>
          <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={pad(hour)}
          onChange={handleHourInput}
          className={segmentClass}
        />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpHour(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      <span className="text-slate-400">:</span>

      <div className="flex flex-col items-center leading-none">
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(1)} tabIndex={-1}>
          <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={pad(minute)}
          onChange={handleMinuteInput}
          className={segmentClass}
        />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      <button
        type="button"
        onClick={togglePeriod}
        className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition font-sans"
      >
        {period}
      </button>
    </div>
  );
}

function buildDateTime(date, time) {
  if (!date || !time) return "";
  const seconds = time.length === 5 ? ":00" : "";
  return `${date} ${time}${seconds}`;
}

// NEW: split a "YYYY-MM-DD HH:mm:ss" string back into { date, time } for the form
function splitDateTime(dateTime) {
  if (!dateTime) return { date: "", time: "" };
  const [date, time] = String(dateTime).split(" ");
  return { date: date || "", time: time ? time.slice(0, 5) : "" };
}

export default function TrackShipmentStep1() {
  const navigate = useNavigate();
  const [carriers, carriersLoading] = useCarrierOptions();
  // NEW: template list now comes from /shipment-templates
  const [templates, , templatesLoading] = useApiOptions(TEMPLATE_LIST_URL);
  // NEW: track the in-flight "load template details" request separately
  // from the plain templates-list loading state above.
  const [templateApplying, setTemplateApplying] = useState(false);

  const step1Draft = useShipmentDraftStore((s) => s.step1);
  const setStep1Draft = useShipmentDraftStore((s) => s.setStep1);
  const resetStep1Draft = useShipmentDraftStore((s) => s.resetStep1);
  const setLastCreatedShipment = useShipmentDraftStore((s) => s.setLastCreatedShipment);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm({
    mode: "onBlur",
    defaultValues: step1Draft,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "updates" });

  useEffect(() => {
    const subscription = watch((values) => {
      setStep1Draft(values);
    });
    return () => subscription.unsubscribe();
  }, [watch, setStep1Draft]);

  const mapApiTemplateToFormValues = (apiData) => {
    if (!apiData) return {};

    const matchedCarrier = carriers.find(
      (c) => c.dot_number === apiData.carrier_dot || c.legal_name === apiData.carrier_name
    );

    const updatesFromApi =
      Array.isArray(apiData.send_updates_to) && apiData.send_updates_to.length > 0
        ? apiData.send_updates_to.map((u) => {
            const { date, time } = splitDateTime(u.date_time);
            return {
              date,
              time,
              duration: u.tracking_days || "",
              interval: u.interval || "",
            };
          })
        : [{ date: "", time: "", duration: "", interval: "" }];

    return {
      proNumber: apiData.pro_number || "",

      carrierName: matchedCarrier ? matchedCarrier.row_id : "",
      carrierMc: apiData.carrier_mc || "",
      carrierDot: apiData.carrier_dot || "",
      carrierPhone: apiData.carrier_phone || "",
      carrierExtension: apiData.carrier_extension || "",

      trackingMethod: apiData.tracking_method || "driver_phone",
      countryCode: COUNTRY_CODES.find((c) => c.dial === apiData.country_code)?.code || "US",
      trackingNumber: apiData.tracking_number || "",

      truckNumber: apiData.truck_number || "",
      trailerNumber: apiData.trailer_number || "",

      driverPhone1: apiData.driver_phone_1 || "",
      driverPhone2: apiData.driver_phone_2 || "",
      driverType: apiData.driver_type || "company_driver",

      teamLoad: !!apiData.team_load,

      dispatcherName: apiData.broker_dispatcher_name || "",
      dispatcherEmail: apiData.broker_dispatcher_email || "",

      updates: updatesFromApi,
      emailUpdatesTo: apiData.email_updates_to || "",

      notes: apiData.notes || "",
    };
  };


  const onApplyTemplate = (trackingNumber) => {
    if (trackingNumber === "scratch") {
      resetStep1Draft();
      reset({ ...BLANK_STEP1_VALUES });
      return;
    }

    setTemplateApplying(true);

    apiFetch(templateDetailUrl(trackingNumber), { method: "GET" })
      .then((res) => {
        // Response shape: { status: true, message: "...", data: {...} }
        if (res && res.status === false) {
          toast.error({
            title: "Could not load template",
            message: res.message || "Please try again.",
          });
          return;
        }

        const apiData = res?.data || res;
        const mapped = mapApiTemplateToFormValues(apiData);
        reset({
          ...BLANK_STEP1_VALUES,
          ...mapped,
          reuseTemplate: trackingNumber,
        });

        toast.success({
          title: "Template applied",
          message: res?.message || "Template data retrieved successfully.",
          duration: 3000,
        });
      })
      .catch((err) => {
        toast.error({
          title: "Could not load template",
          message: err?.message || "Please try again.",
        });
      })
      .finally(() => setTemplateApplying(false));
  };


  const buildPayload = (data) => {
    const selectedCarrier = carriers.find((c) => c.row_id === data.carrierName);

    return {
      pro_number: data.proNumber,

      carrier_name: selectedCarrier?.legal_name || data.carrierName,
      carrier_mc: data.carrierMc,
      carrier_dot: selectedCarrier?.dot_number || data.carrierDot,
      carrier_phone: data.carrierPhone,
      carrier_extension: data.carrierExtension || "",

      tracking_method: data.trackingMethod,
      country_code: COUNTRY_CODES.find((c) => c.code === data.countryCode)?.dial || "+1",
      tracking_number: data.trackingNumber,

      truck_number: data.truckNumber,
      trailer_number: data.trailerNumber,

      driver_phone_1: data.driverPhone1,
      driver_phone_2: data.driverPhone2 || "",

      driver_type: data.driverType,

      team_load: !!data.teamLoad,

      broker_dispatcher_name: data.dispatcherName || "",
      broker_dispatcher_email: data.dispatcherEmail || "",

      send_updates_to: data.updates.map((update) => ({
        date_time: buildDateTime(update.date, update.time),
        tracking_days: update.duration || "",
        interval: update.interval || "",
      })),
      email_updates_to: data.emailUpdatesTo || "",

      notes: data.notes || "",


      save_as_template: !!data.saveAsTemplate,
      template_name: data.trackingNumber,
    };
  };

  const onSubmit = (data) => {
    const payload = buildPayload(data);

    apiFetch("/shipments", {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (res && res.status) {
          toast.success({
            title: "Shipment created",
            message: res.message || `Shipment ${res.data?.shipment_no || ""} saved.`,
            duration: 3000,
          });

          localStorage.setItem("current_shipment_uuid", res.data.uuid);

          setLastCreatedShipment(res.data);
          navigate("/trackshipment/step2", { state: { shipment: res.data } });
        } else {
          toast.error({
            title: "Could not create shipment",
            message: (res && res.message) || "Please check the form and try again.",
            duration: 6000,
          });
        }
      })
      .catch((err) => {
        toast.error({
          title: "Could not create shipment",
          message: err?.message || "Please check the form and try again.",
          duration: 6000,
        });
      });
  };

  
  const carrierOptions = carriers.map((c) => {
    const verified = !!c.stripe_verified_at;
    return {
      value: c.row_id,
      label: `${c.legal_name} (${c.dot_number})`,
      searchText: `${c.legal_name || ""} ${c.dot_number || ""}`,
      render: (isSelected) => (
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${verified ? "bg-green-500" : "bg-yellow-400"}`}
            aria-hidden="true"
          />
          <span>
            {c.legal_name}{" "}
            <span className={isSelected ? "text-blue-900" : "text-slate-900"}>({c.dot_number})</span>
          </span>
        </span>
      ),
    };
  });

  const countryCodeOptions = COUNTRY_CODES.map((c) => ({
    value: c.code,
    label: `${c.code} ${c.dial} ${c.label}`,
    searchText: `${c.code} ${c.dial} ${c.label}`,
    render: (isSelected) => (
      <span className="flex items-center gap-2">
        <CountryFlag code={c.code} />
        <span className={`text-[11px] font-bold uppercase ${isSelected ? "text-white" : "text-slate-500"}`}>{c.code}</span>
        <span>{c.dial} {c.label}</span>
      </span>
    ),
  }));

  return (
    <div className="flex min-h-screen bg-[#EBF1FC] font-sans">
      <StepSidebar currentStep={1} />

      <div className="flex-1 px-8 py-10 md:px-14">
        <div className="mb-4 border-b border-[#E2EAF4] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#93A7CD]">STEP 1</p>
          <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-[#112963]">Shipment Summary</h1>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#7085A8]">
            Fill in the load details below, then continue to the Trip Sheet.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="mt-2 max-w-4xl pb-28">
          <div className="mb-10 flex items-center gap-2">
            <FieldLabel>Reuse from template</FieldLabel>
            <div className="relative">
              <Controller
                control={control}
                name="reuseTemplate"
                render={({ field }) => (
                  <select
                    {...field}
                    className={selectClass}
                    disabled={templatesLoading || templateApplying}
                    onChange={(e) => {
                      field.onChange(e);
                      onApplyTemplate(e.target.value);
                    }}
                  >
                    <option value="scratch">Start from scratch</option>
                    {templatesLoading && <option disabled>Loading…</option>}
                    {templates.map((t) => (
                      <option key={t.tracking_number} value={t.tracking_number}>
                        {t.template_name || t.tracking_number}
                      </option>
                    ))}
                  </select>
                )}
              />
              <ChevronDown />
              {templateApplying && (
                <span className="ml-2 align-middle text-xs text-slate-400 font-sans">Loading template…</span>
              )}
            </div>
          </div>

          <SectionHeading>Load</SectionHeading>
          <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel required>Pro # / Load ID</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. PRO123456"
                {...register("proNumber", { required: "Load ID is required" })}
              />
              <ErrorText>{errors.proNumber?.message}</ErrorText>
            </div>
          </div>

          <SectionHeading>Carrier</SectionHeading>
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel required>Carrier Name</FieldLabel>
              <Controller
                control={control}
                name="carrierName"
                render={({ field: { value } }) => {
                  const selectedCarrier = carriers.find((c) => c.row_id === value);
                  return <CarrierStatusBadge carrier={selectedCarrier} />;
                }}
              />
            </div>
            <Controller
              control={control}
              name="carrierName"
              rules={{ required: "Carrier name is required" }}
              render={({ field: { value, onChange }, fieldState }) => (
                <>
                  <CustomDropdown
                    value={value}
                    onChange={(val) => {
                      onChange(val);
                      // Auto-fill the DOT # field from the selected carrier
                      const selected = carriers.find((c) => c.row_id === val);
                      if (selected) {
                        setValue("carrierDot", selected.dot_number || "", { shouldValidate: true });
                      }
                    }}
                    options={carrierOptions}
                    loading={carriersLoading}
                    searchable
                    placeholder="Select a carrier…"
                    hasError={!!fieldState.error}
                  />
                  <ErrorText>{fieldState.error?.message}</ErrorText>
                </>
              )}
            />
          </div>
          <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <FieldLabel required>Carrier MC #</FieldLabel>
              <input
                className={inputClass}
                placeholder="MC123456"
                {...register("carrierMc", { required: "Carrier MC # is required" })}
              />
              <ErrorText>{errors.carrierMc?.message}</ErrorText>
            </div>
            <div>
              <FieldLabel required>Carrier DOT #</FieldLabel>
              <input
                className={inputClass}
                placeholder="DOT987654"
                {...register("carrierDot", { required: "Carrier DOT # is required" })}
              />
              <ErrorText>{errors.carrierDot?.message}</ErrorText>
            </div>
            <div>
              <FieldLabel>Ext</FieldLabel>
              <input className={inputClass} placeholder="Optional" {...register("carrierExtension")} />
            </div>
          </div>
          <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel required>Carrier Phone</FieldLabel>
              <input
                className={inputClass}
                placeholder="9876543210"
                {...register("carrierPhone", {
                  required: "Carrier phone is required",
                  pattern: { value: PHONE_PATTERN, message: "Enter a valid phone number" },
                })}
              />
              <ErrorText>{errors.carrierPhone?.message}</ErrorText>
            </div>
          </div>

          <SectionHeading>Tracking</SectionHeading>
          <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <FieldLabel>Tracking Method</FieldLabel>
              <div className="relative">
                <select className={selectClass} {...register("trackingMethod")}>
                  {TRACKING_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <ChevronDown />
              </div>
            </div>
            <div>
              <FieldLabel>Country Code</FieldLabel>
              <Controller
                control={control}
                name="countryCode"
                render={({ field: { value, onChange } }) => (
                  <CustomDropdown
                    value={value}
                    onChange={onChange}
                    options={countryCodeOptions}
                    placeholder="Select country…"
                  />
                )}
              />
            </div>
            <div>
              <FieldLabel required>Tracking Full Number</FieldLabel>
              <input
                className={inputClass}
                placeholder="TRK123456789"
                {...register("trackingNumber", { required: "Tracking number is required" })}
              />
              <ErrorText>{errors.trackingNumber?.message}</ErrorText>
            </div>
          </div>

          <SectionHeading>Driver &amp; Equipment</SectionHeading>
          <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel required>Truck Number</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. 4471"
                {...register("truckNumber", { required: "Truck number is required" })}
              />
              <ErrorText>{errors.truckNumber?.message}</ErrorText>
            </div>
            <div>
              <FieldLabel required>Trailer Number</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. TR-208"
                {...register("trailerNumber", { required: "Trailer number is required" })}
              />
              <ErrorText>{errors.trailerNumber?.message}</ErrorText>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel required>Driver Phone 1</FieldLabel>
              <input
                className={inputClass}
                placeholder="Primary"
                {...register("driverPhone1", {
                  required: "Driver phone is required",
                  pattern: { value: PHONE_PATTERN, message: "Enter a valid phone number" },
                })}
              />
              <ErrorText>{errors.driverPhone1?.message}</ErrorText>
            </div>
            <div>
              <FieldLabel>Driver Phone 2</FieldLabel>
              <input
                className={inputClass}
                placeholder="Optional"
                {...register("driverPhone2", {
                  validate: (v) => v === "" || PHONE_PATTERN.test(v) || "Enter a valid phone number",
                })}
              />
              <ErrorText>{errors.driverPhone2?.message}</ErrorText>
            </div>
          </div>

          <div className="mb-4">
            <FieldLabel>Driver Type</FieldLabel>
            <Controller
              control={control}
              name="driverType"
              render={({ field: { value, onChange } }) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {DRIVER_TYPES.map((type) => {
                    const isSelected = value === type.value;
                    return (
                      <button
                        type="button"
                        key={type.value}
                        onClick={() => onChange(type.value)}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition font-sans ${
                          isSelected ? "border-slate-900 text-slate-900" : "border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            isSelected ? "border-slate-900" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />}
                        </span>
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <div className="mb-10">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                {...register("teamLoad")}
              />
              <span className="text-sm font-semibold text-slate-800 font-sans">This load is a team load</span>
            </label>
          </div>

          <SectionHeading>Broker Dispatcher Information</SectionHeading>
          <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <FieldLabel>Dispatcher Name</FieldLabel>
              <input className={inputClass} placeholder="Enter dispatcher name" {...register("dispatcherName")} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input
                className={inputClass}
                placeholder="dispatcher@company.com"
                {...register("dispatcherEmail", {
                  validate: (v) => v === "" || EMAIL_PATTERN.test(v) || "Enter a valid email address",
                })}
              />
              <ErrorText>{errors.dispatcherEmail?.message}</ErrorText>
            </div>
          </div>

          <SectionHeading>Schedule &amp; Updates</SectionHeading>

          <div className="mb-2">
            <FieldLabel>Send Updates To</FieldLabel>
          </div>
          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1.1fr_0.9fr_1.2fr_1.2fr_auto]">
            <span className="text-xs font-semibold font-sans">Date</span>
            <span className="text-xs font-semibold  font-sans">Time</span>
            <span className="text-xs font-semibold font-sans">Duration</span>
            <span className="text-xs font-semibold font-sans">Interval</span>
            <span />
          </div>
          <div className="space-y-3">
            {fields.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1.1fr_0.9fr_1.2fr_1.2fr_auto]"
              >
                <div>
                  <span className="mb-1 block text-xs font-semibold text-slate-500 font-sans sm:hidden">Date</span>
                  <Controller
                    control={control}
                    name={`updates.${index}.date`}
                    rules={index === 0 ? { required: "Date is required" } : undefined}
                    render={({ field: { value, onChange }, fieldState }) => (
                      <>
                        <CustomDatePicker value={value} onChange={onChange} hasError={!!fieldState.error} />
                        <ErrorText>{fieldState.error?.message}</ErrorText>
                      </>
                    )}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold text-slate-500 font-sans sm:hidden">Time</span>
                  <Controller
                    control={control}
                    name={`updates.${index}.time`}
                    rules={index === 0 ? { required: "Time is required" } : undefined}
                    render={({ field: { value, onChange }, fieldState }) => (
                      <>
                        <CustomTimePicker value={value} onChange={onChange} hasError={!!fieldState.error} />
                        <ErrorText>{fieldState.error?.message}</ErrorText>
                      </>
                    )}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold text-slate-500 font-sans sm:hidden">Duration</span>
                  <div className="relative">
                    <Controller
                      control={control}
                      name={`updates.${index}.duration`}
                      render={({ field: { value, onChange } }) => (
                        <select
                          className={selectClass}
                          value={value || ""}
                          onChange={(e) => onChange(e.target.value)}
                        >
                          <option value="" disabled>Select duration…</option>
                          {TRACK_DURATIONS.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      )}
                    />
                    <ChevronDown />
                  </div>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-semibold text-slate-500 font-sans sm:hidden">Interval</span>
                  <div className="relative">
                    <Controller
                      control={control}
                      name={`updates.${index}.interval`}
                      render={({ field: { value, onChange } }) => (
                        <select
                          className={selectClass}
                          value={value || ""}
                          onChange={(e) => onChange(e.target.value)}
                        >
                          <option value="" disabled>Select interval…</option>
                          {INTERVALS.map((i) => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                      )}
                    />
                    <ChevronDown />
                  </div>
                </div>
                <div className="flex h-[46px] items-center justify-self-start sm:justify-self-center">
                  {index > 0 ? (
                    <IconButton size="small" onClick={() => remove(index)} aria-label="Remove update row" sx={{ color: "#ef4444" }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => append({ date: "", time: "", duration: "", interval: "" })}
              className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 font-sans"
            >
              <span className="text-lg leading-none">+</span> Add update
            </button>
          </div>

          <div className="mt-8 mb-8">
            <FieldLabel>Email Updates To</FieldLabel>
            <textarea
              rows={3}
              className={inputClass + " resize-y"}
              placeholder="name@company.com, name2@company.com"
              {...register("emailUpdatesTo", {
                validate: (v) => v === "" || EMAIL_LIST_PATTERN.test(v) || "Enter one or more valid emails, separated by commas",
              })}
            />
            <ErrorText>{errors.emailUpdatesTo?.message}</ErrorText>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-blue-600 font-sans">Notes</label>
            <textarea
              rows={4}
              className={inputClass + " resize-y"}
              placeholder="Type your message"
              {...register("notes")}
            />
          </div>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-8 py-4 backdrop-blur md:px-14 font-sans">
        <div className="ml-0 flex max-w-6xl items-center justify-between md:ml-[280px]">
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              <span className="text-red-500">*</span> Required fields
            </span>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                {...register("saveAsTemplate")}
              />
              <span className="text-sm text-slate-600">Save as template</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit, onInvalid)}
              className="rounded-xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Continue to Trip Sheet →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}