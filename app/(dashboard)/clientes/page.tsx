import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function ClientesPage() {
  return (
    <ModulePlaceholder
      title="Clientes"
      description="Gestión de clientes, contactos y empresas"
      icon={Users}
    />
  );
}
