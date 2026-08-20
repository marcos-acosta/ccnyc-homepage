import type { SheetRow } from "./sheets";

export interface Event {
  date: string;
  time: string;
  title: string;
  location: string;
}

const sheetRowToEvent = (sheetRow: SheetRow): Event => {
  const date = sheetRow["Meeting date"];
  const time = sheetRow["Override time"] || "6PM-8PM";
  const title = sheetRow["Override title"] || "CCNYC meetup";
  const overrideLocation = sheetRow["Override location"];
  const classroomRaw = sheetRow["Classroom"];
  const classroom = `${classroomRaw} classroom` || `classroom TBD`;
  const location = overrideLocation || `Pier 57, ${classroom}`;
  return {
    date: date,
    time: time,
    title: title,
    location: location,
  };
};

export const sheetRowsToEvents = (sheetRows: SheetRow[]): Event[] =>
  sheetRows.map(sheetRowToEvent);
