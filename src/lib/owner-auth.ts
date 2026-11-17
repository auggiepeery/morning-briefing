/**
 * Owner credentialed APIs (Canvas, Google Calendar, live RTI) stay off so a
 * public app cannot expose or mutate the owner's school/calendar data.
 * Routes serve sample data + mock enroll only. Re-enable behind private/team
 * Cursor identity in a follow-up if personal live mode is needed again.
 */
export async function ownerLiveIntegrationsAllowed(
  _request: Request,
): Promise<boolean> {
  return false;
}
