import openpyxl

# Load the workbook
wb = openpyxl.load_workbook('/Users/divyammakar/workspace/Projects/my-dashboard/workboox.xlsx')
ws = wb['ROSERA AC']

# Check rows 1-10 to find headers
print("ROSERA AC - Checking rows 1-10 for headers:\n")
for row_num in range(1, 11):
    print(f"Row {row_num}:")
    for cell in ws[row_num]:
        if cell.value:
            print(f"  Column {cell.column}: '{cell.value}'")
    print()
