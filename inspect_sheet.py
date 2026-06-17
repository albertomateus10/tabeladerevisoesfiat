import openpyxl
wb = openpyxl.load_workbook("Tabela Revisão Programada FIAT Março 2026.xlsx")
sheet = wb["CRONOS 1.8"]
print(f"Sheet: CRONOS 1.8, max_row={sheet.max_row}")
for r in range(1, sheet.max_row + 1):
    row_vals = [sheet.cell(row=r, column=c).value for c in range(1, 10)]
    if any(row_vals):
        print(f"Row {r}: {row_vals}")
