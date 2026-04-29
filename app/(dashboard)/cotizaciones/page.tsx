import { FileText } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function CotizacionesPage() {
  return (
    <ModulePlaceholder
      title="Cotizaciones"
      description="Elaboración y seguimiento de cotizaciones y propuestas"
      icon={FileText}
    />
  );
}
