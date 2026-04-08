export const inferSemesterChoice = (name) => {
  if (typeof name !== "string") return "1st";
  return name.toLowerCase().includes("2nd") ? "2nd" : "1st";
};

export const inferAcademicYearStart = ({ name, start_date, semester }) => {
  if (typeof name === "string") {
    const match = name.match(/A\.Y\.\s*(\d{4})\s*-\s*(\d{4})/i);
    if (match) return match[1];
  }

  if (!start_date) return "";

  const startYear = new Date(`${start_date}T00:00:00`).getFullYear();
  if (Number.isNaN(startYear)) return "";

  return String(semester === "2nd" ? startYear - 1 : startYear);
};

export const getAcademicYearRange = ({ semester, academic_year_start }) => {
  const parsedStartYear = Number.parseInt(academic_year_start, 10);
  if (Number.isNaN(parsedStartYear)) return null;

  const academicStartYear = parsedStartYear;
  const academicEndYear = academicStartYear + 1;

  return {
    label: `A.Y. ${academicStartYear} - ${academicEndYear}`,
    startYear: academicStartYear,
    endYear: academicEndYear,
    semester,
  };
};

export const buildSemesterName = ({ semester, academic_year_start }) => {
  const academicYearRange = getAcademicYearRange({ semester, academic_year_start });

  if (!academicYearRange) return `${semester} Sem`;

  return `${semester} Sem ${academicYearRange.label}`;
};

export const getAcademicYearLabel = ({ semester, academic_year_start }) => {
  const academicYearRange = getAcademicYearRange({ semester, academic_year_start });
  return academicYearRange?.label || "A.Y. --";
};

export const getSemesterDisplayName = (semesterRow) => {
  if (!semesterRow) return "—";

  const semester = inferSemesterChoice(semesterRow.name);
  const academicYearStart = inferAcademicYearStart({
    name: semesterRow.name,
    start_date: semesterRow.start_date,
    semester,
  });

  return buildSemesterName({
    semester,
    academic_year_start: academicYearStart,
  });
};