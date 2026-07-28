import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LOGIN_PATH = "/";
const PUBLIC_PATHS = [LOGIN_PATH, "/signup"];

// Routes that depend on an earlier step being completed first, plus the
// check that must pass before that route is reachable. This is what was
// missing: TrackShipmentStep1 only calls navigate("/trackshipment/step2")
// after a shipment is actually created, but nothing stopped someone from
// typing/refreshing/deep-linking straight into /trackshipment/step2 and
// skipping step 1 entirely. Add more entries here if step 3+ need similar
// protection.
const STEP_PREREQUISITES = [
  {
    // Matches /trackshipment/step2 (and any nested paths under it)
    match: (pathname) => pathname.startsWith("/trackshipment/step2"),
    // Step 1's onSubmit stores this in localStorage right after a
    // successful POST to /shipments — its absence means step 1 was never
    // completed in this session.
    isSatisfied: () => !!localStorage.getItem("current_shipment_uuid"),
    redirectTo: "/trackshipment/step1",
  },
];

function getToken() {
  const match = document.cookie.match(/(?:^|;\s*)crm_auth_token=([^;]*)/);
  return match ? match[1] : null;
}

export default function RouteGuard({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const token = getToken();

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(pathname);

    // If user tries to access a protected route without a token
    if (!isPublic && !token) {
      navigate(`${LOGIN_PATH}?from=${encodeURIComponent(pathname)}`, {
        replace: true,
      });
      return;
    }

    // Allow public routes
    if (isPublic && pathname !== LOGIN_PATH) {
      return;
    }

    // No token on login page
    if (!token) {
      return;
    }

    // If already logged in and opens login page, redirect to dashboard
    if (pathname === LOGIN_PATH) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // NEW: block deep-linking straight into a later wizard step before its
    // prerequisite is met (e.g. opening step 2 without having completed
    // step 1 yet in this session).
    const blockedStep = STEP_PREREQUISITES.find(
      (step) => step.match(pathname) && !step.isSatisfied()
    );
    if (blockedStep) {
      navigate(`${blockedStep.redirectTo}?incomplete=1`, { replace: true });
    }
  }, [pathname, token, navigate]);

  return children;
}