
/**
 * Helpers for schedule/label logic.
 */

export function getDayLabel(dayId: string) {
  const dayMap: Record<string, string> = {
    "segunda": "Segunda",
    "terca": "Terça",
    "quarta": "Quarta",
    "quinta": "Quinta",
    "sexta": "Sexta",
    "sabado": "Sábado",
    "domingo": "Domingo"
  };
  return dayMap[dayId] || dayId;
}

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
