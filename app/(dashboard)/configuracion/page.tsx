import { Settings } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function ConfiguracionPage() {
  return (
    <ModulePlaceholder
      title="Configuración"
      description="Parámetros del sistema, usuarios, roles y permisos"
      icon={Settings}
    />
  );
}
