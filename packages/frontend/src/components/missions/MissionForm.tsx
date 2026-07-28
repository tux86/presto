import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateMissionRequest } from "@presto/shared";
import { createMissionSchema } from "@presto/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface MissionFormProps {
  defaultValues?: Partial<CreateMissionRequest>;
  onSubmit: (data: CreateMissionRequest) => Promise<void>;
  isLoading?: boolean;
}

export function MissionForm({ defaultValues, onSubmit, isLoading }: MissionFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<CreateMissionRequest>({
    resolver: zodResolver(createMissionSchema),
    defaultValues: {
      name: "",
      clientId: "",
      companyId: "",
      dailyRate: undefined,
      startDate: undefined,
      endDate: undefined,
      plannedDays: 0, // Valeur par défaut
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

  async function handleSubmit(data: CreateMissionRequest) {
    try {
      await onSubmit(data);
      toast({
        title: t("mission.form.success.title"),
        description: t("mission.form.success.description"),
      });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      navigate("/missions");
    } catch (_error) {
      toast({
        title: t("mission.form.error.title"),
        description: t("mission.form.error.description"),
        variant: "destructive",
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">{t("mission.form.name")}</Label>
          <Input id="name" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="plannedDays">{t("mission.form.plannedDays")}</Label>
          <Input id="plannedDays" type="number" min="0" {...form.register("plannedDays", { valueAsNumber: true })} />
          {form.formState.errors.plannedDays && (
            <p className="text-sm text-destructive">{form.formState.errors.plannedDays.message}</p>
          )}
        </div>
      </div>
      {/* Autres champs (clientId, companyId, dailyRate, etc.) */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  );
}
