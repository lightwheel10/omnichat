### Supabase Integration Plan (Action Plan + ETA)

#### Overview
Goal: Complete the Supabase integration so conversations/messages, usage analytics, and sidebar/chat UI use the database (with RLS) instead of local-only storage, while maintaining smooth UX and realtime updates.

#### Current state (done)
- `lib/supabaseClient.ts` created and used in `app/page.tsx` for auth/bootstrap.
- DB schema and RLS policies created for `profiles`, `conversations`, `messages` (provided SQL).
- `lib/storage.ts`: routes CRUD to Supabase when signed in; falls back to `localStorage` when not signed in.
- Chat save path: new/updated assistant responses persist via `storage` (so they hit Supabase when signed in).

#### Gaps to finish
- UI still reads/writes directly to `localStorage` in places:
  - Chat header title and some metadata lookups.
  - Message edit save path (`handleSaveEdit`) writes to `localStorage`.
  - Settings usage/billing aggregates from `localStorage` instead of `storage`/Supabase.
- No realtime sync when using Supabase (local-only pub/sub).
- DB freshness: `conversations.updated_at`, token/cost totals depend on client updates only.
- Missing DB indexes for common access paths.
- No migration path for existing local conversations to Supabase upon first login.

---

## Action Plan

### 1) Env & client sanity check
- Verify `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Confirm `lib/supabaseClient.ts` uses these env vars and exports a browser client.

Acceptance
- App boots with auth session restored; no console errors about missing Supabase env.

ETA: 0.25h

### 2) Replace remaining `localStorage` usage with `storage` API
- Chat header title/meta: stop reading `ai-chat-conversations` directly. Options:
  - Best: pass selected conversation’s title via props from `ConversationSidebar` to `ChatInterface`.
  - Alt: fetch conversation meta via `storage.getConversation(conversationId)` and cache locally.
- Edit message flow: in `ChatInterface.handleSaveEdit`, replace `localStorage` write with `storage.updateConversation(conversationId, { messages: updatedMessages })`.
- Settings usage/billing: replace `localStorage` load with `await storage.getConversations()` and compute totals on that list.

Acceptance
- Refreshing the page and/or opening on another machine shows the same data.
- Editing messages persists via Supabase and survives reload.
- Settings usage/billing numbers match DB data.

ETA: 2.5–3.5h

### 3) Realtime sync (Supabase)
- Enhance `storage.subscribe` to, when signed in, attach `supabase.channel('db-changes')` listeners for `conversations` and `messages` (INSERT/UPDATE/DELETE restricted to user via RLS).
- On events, either re-fetch affected records or emit `notify()` so sidebar/chat refresh through existing loaders.
- Keep current local-only pub/sub when signed out.

Acceptance
- Opening two tabs: sending a message in one updates the sidebar and chat in the other within seconds.

ETA: 1.5–2.0h

### 4) DB triggers for freshness/consistency
- Add triggers/functions to the DB:
  - On `messages` INSERT/UPDATE/DELETE: `UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id` (or OLD on DELETE).
  - Optional aggregation: maintain `conversations.tokens` and `conversations.cost` incrementally.

Example (sketch):
```sql
-- Updated-at freshness
create or replace function touch_conversation_updated_at() returns trigger as $$
begin
  update conversations set updated_at = now() where id = coalesce(new.conversation_id, old.conversation_id);
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_messages_touch on messages;
create trigger trg_messages_touch
after insert or update or delete on messages
for each row execute procedure touch_conversation_updated_at();
```

Acceptance
- Querying `conversations` ordered by `updated_at desc` reflects recent message activity without client-side writes.

ETA: 0.5–0.75h

### 5) Indexes/Performance
- Add indexes:
```sql
create index if not exists idx_conversations_user_updated on conversations(user_id, updated_at desc);
create index if not exists idx_messages_conversation_time on messages(conversation_id, timestamp);
```

Acceptance
- Conversation list and message loads are snappy; no sequential scan warnings in logs.

ETA: 0.25h

### 6) Local data migration (on first login)
- On sign-in, detect presence of `ai-chat-conversations` in `localStorage` and offer a one-click import.
- Create Supabase conversation rows + associated messages; map to new UUIDs.
- After a successful import, clear local copy to prevent duplication.

Acceptance
- Existing local chats appear under the authenticated account after import; duplicates avoided.

ETA: 1.0–1.5h

### 7) QA/Verification pass
- Sign up/in/out; session restore on refresh.
- Create/rename/delete conversations; send/edit messages; verify persistence and cross-tab realtime.
- Validate settings usage/billing matches DB data.
- Basic offline fallback still works when not signed in (local mode).

ETA: 1.0h

### 8) Optional hardening
- Retry/backoff wrapper for Supabase calls in `storage`.
- Error toasts for failed DB ops.
- Light telemetry logs around DB failures (console or pluggable).

ETA: 0.5–1.0h (optional)

---

## Timeline Summary

| Step | Task | ETA |
| --- | --- | --- |
| 1 | Env & client sanity | 0.25h |
| 2 | Replace localStorage usage | 2.5–3.5h |
| 3 | Realtime sync | 1.5–2.0h |
| 4 | DB triggers | 0.5–0.75h |
| 5 | Indexes | 0.25h |
| 6 | Local data migration | 1.0–1.5h |
| 7 | QA/Verification | 1.0h |
| 8 | Optional hardening | 0.5–1.0h |

Required subtotal (1–7): ~7.0–9.0 hours

With optional hardening (8): ~7.5–10.0 hours

---

## Risks & Dependencies
- Supabase env keys must be present and valid.
- RLS policies must match the app’s access patterns (already aligned per provided SQL).
- Realtime requires enabling database replication on the relevant tables (Supabase Realtime enabled for the DB/schema).

## Rollout
1. Implement Steps 2, 3, 4, 5 in a feature branch; deploy to preview.
2. Run SQL for triggers + indexes.
3. QA with a test account; verify cross-tab realtime and persistence.
4. Ship migration prompt (Step 6); monitor logs.


