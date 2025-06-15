
/**
 * Helpers for schedule/label logic.
 */

export function getDayRows(schedule: string[]) {
  const rows: string[][] = [];
  let currentRow: string[] = [];

  schedule.forEach((day) => {
    if (currentRow.length === 3) {
      rows.push(currentRow);
      currentRow = [];
    }
    currentRow.push(day);
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}
