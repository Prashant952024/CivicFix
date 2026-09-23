import { AppRoutes } from "@/routes";
import { I18nProvider } from "@/lib/i18n";

export default function App() {
  return (
    <I18nProvider>
      <AppRoutes />
    </I18nProvider>
  );
}
