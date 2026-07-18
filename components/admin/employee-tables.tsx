"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StaffMember = {
  id: string;
  fullName: string;
  phone: string | null;
  role: "instructor" | "dm";
  affiliation: "be_water" | "freelance";
};

type Seller = {
  id: string;
  fullName: string | null;
  email: string;
  createdAt: Date;
};

const staffRoleLabel = { instructor: "Instructor", dm: "DM" };

export function EmployeeTables({ sellers, ownStaff, freelanceStaff }: { sellers: Seller[]; ownStaff: StaffMember[]; freelanceStaff: StaffMember[] }) {
  return (
    <>
      <h2 className="mb-3 text-xl font-semibold">Instructores y DM</h2>
      <StaffTable title="Be Water" members={ownStaff} />
      <StaffTable title="Freelancers" members={freelanceStaff} />

      <h2 className="mb-3 mt-8 text-xl font-semibold">Vendedores</h2>
      <SellerTable sellers={sellers} />
    </>
  );
}

function StaffTable({ title, members }: { title: string; members: StaffMember[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setLoadingId(editing.id);
    setError(null);
    const response = await fetch(`/api/admin/staff/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        phone: form.get("phone"),
        role: form.get("role"),
        affiliation: form.get("affiliation")
      })
    });
    setLoadingId(null);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "No se pudo guardar.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function deactivate(member: StaffMember) {
    if (!confirm(`¿Inactivar a ${member.fullName}?`)) return;
    setLoadingId(member.id);
    setError(null);
    const response = await fetch(`/api/admin/staff/${member.id}`, { method: "DELETE" });
    setLoadingId(null);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "No se pudo inactivar.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="mb-5">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay personas cargadas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="w-[30%] px-4 py-2">Nombre</th>
                <th className="w-[16%] px-4 py-2">Rol</th>
                <th className="w-[36%] px-4 py-2">Teléfono</th>
                <th className="w-[18%] px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t align-top">
                  {editing?.id === member.id ? (
                    <td className="px-4 py-2" colSpan={4}>
                      <form onSubmit={save} className="grid gap-3 md:grid-cols-[1fr_10rem_12rem_12rem_auto]">
                        <Input required name="fullName" defaultValue={member.fullName} />
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" name="role" defaultValue={member.role}>
                          <option value="instructor">Instructor</option>
                          <option value="dm">DM</option>
                        </select>
                        <select className="h-10 rounded-md border bg-background px-3 text-sm" name="affiliation" defaultValue={member.affiliation}>
                          <option value="be_water">Be Water</option>
                          <option value="freelance">Freelance</option>
                        </select>
                        <Input name="phone" defaultValue={member.phone ?? ""} />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={loadingId === member.id}>Guardar</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-2">{member.fullName}</td>
                      <td className="px-4 py-2">{staffRoleLabel[member.role]}</td>
                      <td className="px-4 py-2">
                        {member.phone ? (
                          <a className="inline-flex items-center gap-2 text-emerald-700 hover:underline" href={`https://wa.me/${member.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                            <MessageCircle className="h-4 w-4" />
                            {member.phone}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1.5">
                          <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" title="Editar" aria-label={`Editar a ${member.fullName}`} onClick={() => setEditing(member)}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" title="Inactivar" aria-label={`Inactivar a ${member.fullName}`} disabled={loadingId === member.id} onClick={() => deactivate(member)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SellerTable({ sellers }: { sellers: Seller[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Seller | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const form = new FormData(event.currentTarget);
    setLoadingId(editing.id);
    setError(null);
    const response = await fetch(`/api/admin/sellers/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: form.get("fullName"), email: form.get("email") })
    });
    setLoadingId(null);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "No se pudo guardar.");
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function deactivate(seller: Seller) {
    if (!confirm(`¿Inactivar a ${seller.fullName ?? seller.email}?`)) return;
    setLoadingId(seller.id);
    setError(null);
    const response = await fetch(`/api/admin/sellers/${seller.id}`, { method: "DELETE" });
    setLoadingId(null);
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(typeof result.error === "string" ? result.error : "No se pudo inactivar.");
      return;
    }
    router.refresh();
  }

  if (sellers.length === 0) return <p className="text-muted-foreground">Todavía no creaste ningún vendedor.</p>;

  return (
    <>
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="w-[26%] px-4 py-2">Nombre</th>
              <th className="w-[38%] px-4 py-2">Email</th>
              <th className="w-[18%] px-4 py-2">Creado</th>
              <th className="w-[18%] px-4 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((seller) => (
              <tr key={seller.id} className="border-t align-top">
                {editing?.id === seller.id ? (
                  <td className="px-4 py-2" colSpan={4}>
                    <form onSubmit={save} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <Input name="fullName" defaultValue={seller.fullName ?? ""} />
                      <Input required type="email" name="email" defaultValue={seller.email} />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={loadingId === seller.id}>Guardar</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                      </div>
                    </form>
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-2">{seller.fullName ?? "—"}</td>
                    <td className="px-4 py-2">{seller.email}</td>
                    <td className="px-4 py-2">{new Date(seller.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1.5">
                        <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" title="Editar" aria-label={`Editar a ${seller.fullName ?? seller.email}`} onClick={() => setEditing(seller)}><Pencil className="h-4 w-4" /></Button>
                        <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" title="Inactivar" aria-label={`Inactivar a ${seller.fullName ?? seller.email}`} disabled={loadingId === seller.id} onClick={() => deactivate(seller)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
