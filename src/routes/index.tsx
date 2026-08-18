import { Navigate, Route, Routes } from "react-router-dom";

import { RootLayout } from "@/components/layout/root-layout";
import { HomePage } from "@/routes/home";
import { NotFoundPage } from "@/routes/not-found";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="home" element={<Navigate replace to="/" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
