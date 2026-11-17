import { requireRoute } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/forms/action-form";
import { gantiPasswordAction, updateProfilAction } from "@/lib/actions/profil";
import { ROLE_LABEL } from "@/lib/domain/types";

export const metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const p = await requireRoute("pengaturan");
  return (
    <>
      <PageHeader title="Pengaturan akun" description={`${p.email ?? ""} · ${ROLE_LABEL[p.role]} — role hanya dapat diubah admin.`} />
      <div className="grid max-w-4xl grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profil" />
          <div className="p-5">
            <ActionForm action={updateProfilAction} columns={1} fields={[
              { name: "nama_lengkap", label: "Nama lengkap", type: "text", required: true, defaultValue: p.nama_lengkap, autoComplete: "name" },
              { name: "no_hp", label: "Nomor HP", type: "tel", defaultValue: p.no_hp, autoComplete: "tel" },
            ]} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Ganti password" />
          <div className="p-5">
            <ActionForm action={gantiPasswordAction} columns={1} resetOnSuccess submitLabel="Ganti password" fields={[
              { name: "password", label: "Password baru", type: "password", required: true, hint: "Minimal 10 karakter.", autoComplete: "new-password" },
              { name: "konfirmasi", label: "Ulangi password", type: "password", required: true, autoComplete: "new-password" },
            ]} />
          </div>
        </Card>
      </div>
    </>
  );
}
