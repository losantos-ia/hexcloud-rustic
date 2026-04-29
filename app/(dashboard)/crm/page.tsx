import { UserCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export default function CRMPage() {
  return (
    <ModulePlaceholder
      title="CRM"
      description="Pipeline de ventas, oportunidades y seguimiento de prospectos"
      icon={UserCheck}
    />
  );
}
