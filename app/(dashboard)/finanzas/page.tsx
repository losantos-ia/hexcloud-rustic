import { DollarSign } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function FinanzasPage() {
  return (
    <ModulePlaceholder
      title="Finanzas"
      description="Contabilidad, flujo de caja, cuentas por cobrar y pagar"
      icon={DollarSign}
    />
  );
}
