import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PUBLIC_PATHS = ["/", "/signup"];

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

    if (!isPublic && !token) {
      navigate(`/?from=${encodeURIComponent(pathname)}`, { replace: true });
      return;
    }

    if (pathname === "/" && token) {
      navigate("/dashboard", { replace: true });
    }
  }, [pathname, token, navigate]);

  return children;
}