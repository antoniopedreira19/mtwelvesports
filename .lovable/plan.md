

## Plan: Rename to "Próximos Passos" and Add Editing Support

The user wants two things:
1. Rename "Next Step" / "Próximo Passo" to **"Próximos Passos"** everywhere
2. Allow editing `next_step_notes` in the ClientDetailDialog (edit modal)

### Current State

- `PipelineStage` type does NOT include `next_step` — it only has `radar | contato | negociacao | fechado | perdido`
- `Client` interface does NOT have `next_step_notes` field
- `useRealtimeClients` does NOT have a "Next Step" column
- `ClientDetailDialog` (edit form) has no `next_step_notes` field
- `ClientViewDialog` has no "Próximos Passos" section
- `LeadCard` uses `(client as any).next_step_notes` which suggests it was partially added

It seems the previous round of edits to add the `next_step` column didn't fully persist. The user's request implies they want the label renamed and the edit capability added. I'll include the full implementation.

### Changes

**1. `src/types/index.ts`**
- Add `"next_step"` to `PipelineStage`
- Add `next_step_notes?: string | null` to `Client`

**2. `src/hooks/useRealtimeClients.ts`**
- Add `{ id: "next_step", title: "Próximos Passos", clients: [] }` column after `contato`

**3. `src/components/modules/crm/LeadCard.tsx`**
- Add `next_step` to `stageBorder` record
- Use `client.next_step_notes` instead of `(client as any).next_step_notes`
- Rename label from "Próximo Passo" to "Próximos Passos"

**4. `src/components/modules/crm/PipelineBoard.tsx`**
- Add `next_step` entries to `columnColors` and `columnBadgeColors`
- Add `NextStepDialog` import and drag handling for `next_step` column (modal on drag)

**5. `src/components/modules/crm/NextStepDialog.tsx`** (create)
- Modal that opens when dragging a lead into "Próximos Passos" column
- Text area for `next_step_notes`, confirm saves to Supabase

**6. `src/components/modules/crm/ClientViewDialog.tsx`**
- Add `next_step` to `stageLabels` and `stageBadgeColors`
- Add "Próximos Passos" display section showing `client.next_step_notes`

**7. `src/components/modules/crm/ClientDetailDialog.tsx`**
- Add `next_step_notes` to form schema, default values, reset, and submit
- Add `next_step` to stage select options
- Add `Textarea` field labeled "Próximos Passos" in the form

