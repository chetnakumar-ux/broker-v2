import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";

import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CloseIcon from "@mui/icons-material/Close";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

const USERS_ENDPOINT = "/users";
const USER_SAVE_ENDPOINT = "/users/save";
const USER_SINGLE_ENDPOINT = "/users/single";
const USER_INVITE_ENDPOINT = "/invitations";
const ROLES_ENDPOINT = "/roles";

const AUTH_USER_KEY = "crm_user";

const BRAND = "#1e40af";
const BRAND_LIGHT = "#3b82f6";
const BRAND_DARK = "#1c3899";
const BRAND_SOFT = "#eff6ff";
const BRAND_GRADIENT = `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_LIGHT} 100%)`;
const INK = "#0f172a";
const SUBTLE = "#64748b";
const BORDER = "#e2e8f0";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^\d{10,}$/;

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#fff",
    transition: "box-shadow 120ms ease, border-color 120ms ease",
    "& fieldset": { borderColor: BORDER },
    "&:hover fieldset": { borderColor: "#cbd5e1" },
    "&.Mui-focused fieldset": { borderColor: BRAND, borderWidth: "1.5px" },
    "&.Mui-focused": { boxShadow: `0 0 0 4px ${BRAND_SOFT}` },
    "&.Mui-error.Mui-focused": { boxShadow: "0 0 0 4px #fee2e2" },
  },
  "& .MuiInputLabel-root": {
    color: SUBTLE,
    "&.Mui-focused": { color: BRAND },
  },
  "& .MuiFormHelperText-root": { marginLeft: "2px", fontSize: "12px" },
};

const adornmentIconSx = { fontSize: "18px", color: SUBTLE };

const SectionLabel = ({ icon, text }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.25 }}>
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        borderRadius: "8px",
        backgroundColor: BRAND_SOFT,
        color: BRAND,
      }}
    >
      {icon}
    </Box>
    <Typography sx={{ fontSize: "12.5px", fontWeight: 700, letterSpacing: "0.03em", color: INK }}>
      {text}
    </Typography>
  </Box>
);

const cardSx = {
  p: 3,
  backgroundColor: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: "16px",
};

const submitButtonSx = {
  background: BRAND_GRADIENT,
  textTransform: "none",
  fontWeight: 700,
  fontSize: "14px",
  borderRadius: "12px",
  px: 3,
  py: 1.1,
  boxShadow: "0 10px 24px -10px rgba(30, 64, 175, 0.6)",
  transition: "transform 120ms ease, box-shadow 120ms ease, filter 120ms ease",
  "&:hover": {
    filter: "brightness(1.05)",
    boxShadow: "0 12px 28px -8px rgba(30, 64, 175, 0.7)",
    transform: "translateY(-1px)",
  },
  "&:active": { transform: "translateY(0)" },
  "&.Mui-disabled": { background: "#94a3b8", color: "#ffffff" },
};

const cancelButtonSx = {
  color: SUBTLE,
  fontWeight: 600,
  textTransform: "none",
  borderRadius: "10px",
  px: 2,
  "&:hover": { backgroundColor: "#f1f5f9" },
};

const dialogPaperSx = {
  borderRadius: "22px",
  boxShadow: "0 30px 70px -20px rgba(15, 23, 42, 0.35)",
  overflow: "hidden",
};

const RequiredLabel = ({ text }) => (
  <>
    {text}
    <Box component="span" sx={{ color: "#dc2626" }}> *</Box>
  </>
);

function getCurrentUser() {
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Role object -> display string
//
// The API can return `role` on a user record as:
//   - a plain string                              -> use as-is
//   - a single role object { id, slug, name, ... } -> use .name
//   - an array of role objects/strings              -> join the names
// ---------------------------------------------------------------------------
function roleToDisplayName(role) {
  if (!role) return "";
  if (typeof role === "string") return role;
  if (Array.isArray(role)) {
    return role
      .map((r) => (typeof r === "string" ? r : r?.name))
      .filter(Boolean)
      .join(", ");
  }
  return role.name ?? "";
}

// ---------------------------------------------------------------------------
// Shared roles hook — both AddEditUserForm and InviteUserForm read from here.
//
// GET /roles ->
// { data: { roles: [ { id, slug, name, ... } ], assignable_slugs: [...] } }
//
// Normalized down to { key: id, value: name } for the Autocomplete.
// ---------------------------------------------------------------------------
function useRoles() {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch(ROLES_ENDPOINT)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data?.roles) ? res.data.roles : [];
        setRoles(list.map((r) => ({ key: r.id, value: r.name })));
      })
      .catch((err) => console.error("Failed to load roles:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  return { roles };
}

// ---------------------------------------------------------------------------
// Users list fetch
//
// GET /users ->
// { data: { users: [ { uuid, first_name, last_name, email, phone, role } ],
//           pagination: { current_page, last_page, per_page, total } } }
// ---------------------------------------------------------------------------
function useUsers(pageIndex, pageSize, reloadKey) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const page = pageIndex + 1;
    const query = `page=${page}&per_page=${pageSize}&sort_by=added_on&sort_order=desc`;

    apiFetch(`${USERS_ENDPOINT}?${query}`)
      .then((res) => {
        if (cancelled) return;

        const records = Array.isArray(res?.data?.users) ? res.data.users : [];

        const mapped = records.map((u) => ({
          row_id: u.uuid,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          phone: u.phone,
          role_names: roleToDisplayName(u.role),
        }));

        setRows(mapped);
        setTotal(Number(res?.data?.pagination?.total ?? mapped.length) || 0);
      })
      .catch((err) => {
        console.error("Failed to load users:", err);
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageIndex, pageSize, reloadKey]);

  return { rows, total, loading };
}

// ---------------------------------------------------------------------------
// Modal chrome shared by both forms (header with gradient avatar + close btn)
// ---------------------------------------------------------------------------
function ModalHeader({ icon, title, subtitle, onClose }) {
  return (
    <Box
      sx={{
        position: "relative",
        px: 4,
        pt: 4,
        pb: 3,
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        background: `linear-gradient(160deg, ${BRAND_SOFT} 0%, #ffffff 70%)`,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <Avatar
        sx={{
          background: BRAND_GRADIENT,
          color: "#fff",
          width: 48,
          height: 48,
          boxShadow: "0 10px 22px -8px rgba(30, 64, 175, 0.55)",
        }}
      >
        {icon}
      </Avatar>

      <Box sx={{ pt: 0.25 }}>
        <Typography sx={{ fontSize: "19px", fontWeight: 800, color: INK, lineHeight: 1.3 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "13px", color: SUBTLE, mt: 0.25 }}>
          {subtitle}
        </Typography>
      </Box>

      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          color: SUBTLE,
          backgroundColor: "#fff",
          border: `1px solid ${BORDER}`,
          "&:hover": { backgroundColor: "#f1f5f9" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit User modal
// ---------------------------------------------------------------------------
function AddEditUserForm({ open, onClose, rowId, roles, usersOf, onSuccess }) {
  const isEdit = !!rowId;
  const [submitError, setSubmitError] = useState("");
  const [loadingUser, setLoadingUser] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onTouched",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      roles: null,
    },
  });

  useEffect(() => {
    if (!open) return;

    setSubmitError("");

    if (!isEdit) {
      reset({ first_name: "", last_name: "", email: "", phone: "", password: "", roles: null });
      return;
    }

    setLoadingUser(true);
    apiFetch(`${USER_SINGLE_ENDPOINT}?row_id=${encodeURIComponent(rowId)}`)
      .then((res) => {
        if (res && res.status && res.data) {
          const u = res.data;

          const matchedRole =
            typeof u.role === "object" && u.role !== null
              ? roles.find((r) => r.key === u.role.id) || null
              : roles.find((r) => r.value === u.role) || null;

          reset({
            first_name: u.first_name || "",
            last_name: u.last_name || "",
            email: u.email || "",
            phone: u.phone || "",
            password: "",
            roles: matchedRole,
          });
        }
      })
      .catch(() => {
        setSubmitError("Could not load user details.");
      })
      .finally(() => setLoadingUser(false));
  }, [open, isEdit, rowId, roles, reset]);

  const handleClose = () => {
    reset();
    setSubmitError("");
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      users_of: usersOf,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      roles: data.roles?.key ?? "",
    };

    if (isEdit) payload.row_id = rowId;
    if (data.password) payload.password = data.password;

    try {
      const res = await apiFetch(USER_SAVE_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status) {
        setSubmitError("");
        reset();
        onSuccess();
      } else {
        setSubmitError((res && res.message) || "Could not save user.");
      }
    } catch (err) {
      setSubmitError(err?.message || "Could not save user.");
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={handleClose} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <ModalHeader
        icon={<PersonAddIcon fontSize="small" />}
        title={isEdit ? "Edit user" : "Add a new user"}
        subtitle={isEdit ? "Update this teammate's details and access." : "Create an account for a new teammate."}
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ px: 4, py: 3.5, backgroundColor: "#f8fafc", maxHeight: "64vh", overflowY: "auto" }}>
          {loadingUser ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={22} sx={{ color: BRAND }} />
            </Box>
          ) : (
            <>
              <Box sx={{ ...cardSx, mb: 2.5 }}>
                <SectionLabel icon={<BadgeOutlinedIcon sx={{ fontSize: 16 }} />} text="PERSONAL DETAILS" />

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.25 }}>
                  <TextField
                    label={<RequiredLabel text="First name" />}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message || " "}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("first_name", { required: "First name is required" })}
                  />

                  <TextField
                    label={<RequiredLabel text="Last name" />}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message || " "}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonOutlineIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("last_name", { required: "Last name is required" })}
                  />

                  <TextField
                    label={<RequiredLabel text="Email" />}
                    type="email"
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    error={!!errors.email}
                    helperText={errors.email?.message || " "}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <MailOutlineIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("email", {
                      required: "Email is required",
                      pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address" },
                    })}
                  />

                  <TextField
                    label={<RequiredLabel text="Mobile" />}
                    fullWidth
                    size="small"
                    sx={fieldSx}
                    error={!!errors.phone}
                    helperText={errors.phone?.message || " "}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIphoneIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("phone", {
                      required: "Mobile number is required",
                      pattern: { value: MOBILE_PATTERN, message: "Numbers only, at least 10 digits" },
                    })}
                  />

                  <TextField
                    label={isEdit ? "New password (optional)" : <RequiredLabel text="Password" />}
                    type="password"
                    fullWidth
                    size="small"
                    sx={{ ...fieldSx, gridColumn: "1 / -1" }}
                    error={!!errors.password}
                    helperText={errors.password?.message || (isEdit ? "Leave blank to keep the current password" : " ")}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockOutlinedIcon sx={adornmentIconSx} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    {...register("password", {
                      required: isEdit ? false : "Password is required",
                      minLength: { value: 6, message: "At least 6 characters" },
                    })}
                  />
                </Box>
              </Box>

              <Box sx={cardSx}>
                <SectionLabel icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />} text="ACCESS" />

                <Controller
                  name="roles"
                  control={control}
                  rules={{ required: "Please select a role" }}
                  render={({ field }) => (
                    <Autocomplete
                      disablePortal
                      size="small"
                      options={roles}
                      loading={roles.length === 0}
                      value={field.value}
                      onChange={(e, value) => field.onChange(value)}
                      getOptionLabel={(option) => option?.value || ""}
                      isOptionEqualToValue={(option, value) => option.key === value?.key}
                      popupIcon={<KeyboardArrowDownIcon />}
                      sx={fieldSx}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Role"
                          placeholder="Select Role"
                          error={!!errors.roles}
                          helperText={errors.roles?.message}
                        />
                      )}
                    />
                  )}
                />
              </Box>

              {submitError && (
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "10px", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                  <ErrorOutlineIcon sx={{ fontSize: "18px", color: "#dc2626" }} />
                  <Typography sx={{ fontSize: "13px", color: "#b91c1c" }}>{submitError}</Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 4, py: 2.5, borderTop: `1px solid ${BORDER}`, backgroundColor: "#ffffff" }}>
          <Button onClick={handleClose} disabled={isSubmitting} sx={cancelButtonSx}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || loadingUser}
            startIcon={isSubmitting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : null}
            sx={submitButtonSx}
          >
            {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add user"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Invite User modal
// ---------------------------------------------------------------------------
function InviteUserForm({ open, onClose, roles, usersOf, onSuccess }) {
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onTouched",
    defaultValues: { first_name: "", last_name: "", email: "", phone: "", roles: null },
  });

  const handleClose = () => {
    reset();
    setSubmitError("");
    onClose();
  };

  const onSubmit = async (data) => {
    const payload = {
      users_of: usersOf,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      role_id: data.roles?.key ?? "",
    };

    try {
      const res = await apiFetch(USER_INVITE_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.status) {
        setSubmitError("");
        reset();
        onSuccess();
      } else {
        setSubmitError((res && res.message) || "Could not send invite.");
      }
    } catch (err) {
      setSubmitError(err?.message || "Could not send invite.");
    }
  };

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={handleClose} slotProps={{ paper: { sx: dialogPaperSx } }}>
      <ModalHeader
        icon={<PersonAddAlt1Icon fontSize="small" />}
        title="Invite a teammate"
        subtitle="They'll get an email with steps to set up their account."
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ px: 4, py: 3.5, backgroundColor: "#f8fafc", maxHeight: "64vh", overflowY: "auto" }}>
          <Box sx={{ ...cardSx, mb: 2.5 }}>
            <SectionLabel icon={<BadgeOutlinedIcon sx={{ fontSize: 16 }} />} text="PERSONAL DETAILS" />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.25 }}>
              <TextField
                label={<RequiredLabel text="First name" />}
                fullWidth
                size="small"
                sx={fieldSx}
                error={!!errors.first_name}
                helperText={errors.first_name?.message || " "}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={adornmentIconSx} />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("first_name", { required: "First name is required" })}
              />

              <TextField
                label={<RequiredLabel text="Last name" />}
                fullWidth
                size="small"
                sx={fieldSx}
                error={!!errors.last_name}
                helperText={errors.last_name?.message || " "}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon sx={adornmentIconSx} />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("last_name", { required: "Last name is required" })}
              />

              <TextField
                label={<RequiredLabel text="Email" />}
                type="email"
                fullWidth
                size="small"
                sx={fieldSx}
                error={!!errors.email}
                helperText={errors.email?.message || " "}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlineIcon sx={adornmentIconSx} />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("email", {
                  required: "Email is required",
                  pattern: { value: EMAIL_PATTERN, message: "Enter a valid email address" },
                })}
              />

              <TextField
                label={<RequiredLabel text="Mobile" />}
                fullWidth
                size="small"
                sx={fieldSx}
                error={!!errors.phone}
                helperText={errors.phone?.message || " "}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIphoneIcon sx={adornmentIconSx} />
                      </InputAdornment>
                    ),
                  },
                }}
                {...register("phone", {
                  required: "Mobile number is required",
                  pattern: { value: MOBILE_PATTERN, message: "Numbers only, at least 10 digits" },
                })}
              />
            </Box>
          </Box>

          <Box sx={cardSx}>
            <SectionLabel icon={<ShieldOutlinedIcon sx={{ fontSize: 16 }} />} text="ACCESS" />

            <Controller
              name="roles"
              control={control}
              rules={{ required: "Please select a role" }}
              render={({ field }) => (
                <Autocomplete
                  disablePortal
                  size="small"
                  options={roles}
                  loading={roles.length === 0}
                  value={field.value}
                  onChange={(e, value) => field.onChange(value)}
                  getOptionLabel={(option) => option?.value || ""}
                  isOptionEqualToValue={(option, value) => option.key === value?.key}
                  popupIcon={<KeyboardArrowDownIcon />}
                  sx={fieldSx}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Role"
                      placeholder="Select Role"
                      error={!!errors.roles}
                      helperText={errors.roles?.message}
                    />
                  )}
                />
              )}
            />
          </Box>

          {submitError && (
            <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderRadius: "10px", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
              <ErrorOutlineIcon sx={{ fontSize: "18px", color: "#dc2626" }} />
              <Typography sx={{ fontSize: "13px", color: "#b91c1c" }}>{submitError}</Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 4, py: 2.5, borderTop: `1px solid ${BORDER}`, backgroundColor: "#ffffff" }}>
          <Button onClick={handleClose} disabled={isSubmitting} sx={cancelButtonSx}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : null}
            sx={submitButtonSx}
          >
            {isSubmitting ? "Sending…" : "Send invite"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const columnHelper = createColumnHelper();

export default function UsersList() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const usersOf = currentUser?.row_id ?? currentUser?.id ?? null;

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  const [editRowId, setEditRowId] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { roles } = useRoles();
  const { rows, total, loading } = useUsers(pageIndex, pageSize, reloadKey);

  const triggerReload = useCallback(() => setReloadKey((k) => k + 1), []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("first_name", {
        header: "First Name",
        cell: (info) => <span className="text-sm font-bold text-slate-800 font-sans">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("last_name", {
        header: "Last Name",
        cell: (info) => <span className="text-sm text-slate-700 font-sans">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => <span className="text-sm text-slate-700 font-sans">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("phone", {
        header: "Mobile",
        cell: (info) => <span className="text-sm font-bold text-slate-800 font-sans">{info.getValue() || "—"}</span>,
      }),
      columnHelper.accessor("role_names", {
        header: "Roles",
        cell: (info) => <span className="text-sm text-slate-700 font-sans">{info.getValue() || "—"}</span>,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-800 bg-transparent border-0 cursor-pointer"
            onClick={() => setEditRowId(info.row.original.row_id)}
          >
            View
            <ArrowForwardIcon sx={{ fontSize: "13px" }} />
          </button>
        ),
      }),
    ],
    []
  );

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: { pagination: { pageIndex, pageSize } },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14 font-sans">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Users</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
            Enter carrier details to activate live telemetry and predictive delivery windows.
          </p>
        </div>

        <Button
          variant="contained"
          startIcon={<PersonAddAlt1Icon sx={{ fontSize: "18px" }} />}
          onClick={() => setInviteOpen(true)}
          sx={{
            background: BRAND_GRADIENT,
            textTransform: "none",
            fontWeight: 700,
            fontSize: "14px",
            borderRadius: "12px",
            px: 3,
            py: 1.25,
            boxShadow: "0 10px 24px -10px rgba(30, 64, 175, 0.6)",
            transition: "transform 120ms ease, box-shadow 120ms ease, filter 120ms ease",
            "&:hover": {
              filter: "brightness(1.05)",
              boxShadow: "0 12px 28px -8px rgba(30, 64, 175, 0.7)",
              transform: "translateY(-1px)",
            },
            "&:active": { transform: "translateY(0)" },
          }}
        >
          Add User
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FormatListBulletedIcon sx={{ fontSize: 18 }} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Records</p>
            <p className="text-base font-bold text-slate-900">{total} Active</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Display:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <span className="text-sm text-slate-400">{rangeStart}-{rangeEnd} of {total}</span>
          <IconButton size="small" disabled={pageIndex === 0} onClick={() => setPageIndex((p) => Math.max(0, p - 1))} sx={{ color: "#94a3b8" }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled={pageIndex + 1 >= pageCount} onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))} sx={{ color: "#94a3b8" }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="flex items-center justify-center gap-2.5 text-sm font-medium text-slate-400">
                      <CircularProgress size={16} sx={{ color: "#94a3b8" }} />
                      Loading users…
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2.5">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <PeopleOutlineIcon sx={{ fontSize: 22 }} />
                      </span>
                      <p className="text-[14px] font-semibold text-slate-600">No users yet</p>
                      <p className="text-[13px] leading-relaxed text-slate-400">
                        Add a teammate directly, or send an invite so they can set up their own account.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.original.row_id || row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEditUserForm
        open={!!editRowId}
        rowId={editRowId}
        roles={roles}
        usersOf={usersOf}
        onClose={() => setEditRowId(null)}
        onSuccess={() => {
          setEditRowId(null);
          triggerReload();
          toast.success({ title: "User updated", message: "Changes saved successfully.", duration: 3000 });
        }}
      />

      <InviteUserForm
        open={inviteOpen}
        roles={roles}
        usersOf={usersOf}
        onClose={() => setInviteOpen(false)}
        onSuccess={() => {
          setInviteOpen(false);
          triggerReload();
          toast.success({ title: "Invite sent", message: "Invitation sent successfully.", duration: 3000 });
        }}
      />
    </div>
  );
}