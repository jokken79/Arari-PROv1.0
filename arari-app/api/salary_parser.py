"""
Specialized parser for .xlsm salary statement files (給与明細)

Handles complex multi-sheet, multi-employee layout where:
- Each file has multiple sheets (1 summary + 25 company sheets)
- Each company sheet has multiple employees side-by-side
- Each employee occupies ~14 columns with data in fixed row positions
"""

import openpyxl
import re
from typing import List, Optional
from io import BytesIO
from models import PayrollRecordCreate


class SalaryStatementParser:
    """Parser for complex .xlsm salary statement files (給与明細)"""

    # Each employee occupies this many columns width
    EMPLOYEE_COLUMN_WIDTH = 14

    # Row positions for data extraction (1-indexed)
    # Verified from actual file structure
    ROW_POSITIONS = {
        'period': 5,          # "2025年1月分(2月17日支給)"
        'employee_id': 6,     # 6-digit employee ID
        'name': 7,            # Employee name
        'work_days': 11,      # 出勤日数
        'paid_leave_days': 12,  # 有給日数
        'work_hours': 13,     # 労働時間
        'overtime_hours': 14, # 残業時間
        'base_salary': 16,    # 基本給
        'overtime_pay': 17,   # 残業代
        'other_allowances': 18,  # その他手当
        'transport_allowance': 21,  # 通勤費
        'net_salary': 30,     # 差引支給額
    }

    # Column offsets within an employee block
    # First employee block starts at col 1, employee_id at col 10
    # So offset = 9
    # Period is at col 3 in this example = offset 2
    # Name is at col 3 = offset 2
    COLUMN_OFFSETS = {
        'period': 2,          # [3] = col 3 - base 1
        'employee_id': 9,     # [10] = col 10 - base 1
        'name': 2,            # [3] = col 3 - base 1
        'work_days': 5,       # [6] from data = col 6 - base 1
        'paid_leave_days': 10,  # [11] = col 11 - base 1
        'work_hours': 3,      # [4] from data = col 4 - base 1
        'overtime_hours': 3,  # [4] from data
        'base_salary': 3,     # [4] from data
        'overtime_pay': 3,    # [4] from data
        'other_allowances': 3,  # [4] from data
        'transport_allowance': 3,  # [4] from data
        'net_salary': 3,      # [4] from data
    }

    def parse(self, content: bytes) -> List[PayrollRecordCreate]:
        """
        Parse .xlsm file and extract all employee payroll records

        Args:
            content: Binary content of the Excel file

        Returns:
            List of PayrollRecordCreate objects
        """
        try:
            wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
        except Exception as e:
            print(f"Error loading Excel file: {e}")
            return []

        records = []

        # Process all sheets except the summary sheet (集計)
        for sheet_name in wb.sheetnames:
            if sheet_name == '集計' or sheet_name == 'Summary':
                continue  # Skip summary sheets

            try:
                ws = wb[sheet_name]
                sheet_records = self._parse_sheet(ws, sheet_name)
                records.extend(sheet_records)
            except Exception as e:
                print(f"Warning: Error parsing sheet '{sheet_name}': {e}")
                continue

        return records

    def _parse_sheet(self, ws, sheet_name: str) -> List[PayrollRecordCreate]:
        """
        Parse a single company sheet containing multiple employees side-by-side

        Args:
            ws: openpyxl worksheet
            sheet_name: Name of the sheet for logging

        Returns:
            List of PayrollRecordCreate objects from this sheet
        """
        records = []

        # Detect employee column positions by finding employee IDs in row 6
        employee_cols = self._detect_employee_columns(ws)

        if not employee_cols:
            print(f"  Warning: No employee IDs found in sheet '{sheet_name}'")
            return records

        # Extract data for each employee
        for col_idx in employee_cols:
            record = self._extract_employee_data(ws, col_idx)
            if record:
                records.append(record)

        return records

    def _detect_employee_columns(self, ws) -> List[int]:
        """
        Find column indices where employee blocks start

        Employee IDs are 6-digit numbers appearing in row 6 at columns: 10, 24, 38, 52, ...
        Each employee block occupies ~14 columns starting from column: 1, 15, 29, 43, ...

        We find employee ID positions, then calculate the base column of each block

        Returns:
            List of base column indices (1-indexed) for each employee block
        """
        columns = []

        # Scan row 6 (employee_id row) for 6-digit numbers
        for col in range(1, ws.max_column + 1):
            cell_value = ws.cell(row=self.ROW_POSITIONS['employee_id'], column=col).value

            if cell_value is None:
                continue

            # Check if it's a 6-digit number (employee ID)
            try:
                emp_id_str = str(cell_value).strip()
                if emp_id_str.isdigit() and len(emp_id_str) == 6:
                    # Found an employee ID at column col
                    # The employee IDs appear at columns: 10, 24, 38, 52...
                    # Each block starts 9 columns before the employee ID
                    # So: block 1 starts at 10-9=1, block 2 starts at 24-9=15, etc.
                    base_col = col - 9
                    if base_col > 0 and base_col not in columns:
                        columns.append(base_col)
            except (ValueError, AttributeError):
                continue

        return sorted(columns)

    def _extract_employee_data(self, ws, base_col: int) -> Optional[PayrollRecordCreate]:
        """
        Extract data for one employee from a specific column position

        Args:
            ws: openpyxl worksheet
            base_col: Starting column (1-indexed) of the employee block

        Returns:
            PayrollRecordCreate object or None if extraction fails
        """
        try:
            # Extract period from row 5
            period_cell = ws.cell(
                row=self.ROW_POSITIONS['period'],
                column=base_col + self.COLUMN_OFFSETS['period']
            )
            period = self._parse_period(period_cell.value)
            if not period:
                return None

            # Extract employee_id from row 6
            emp_id_cell = ws.cell(
                row=self.ROW_POSITIONS['employee_id'],
                column=base_col + self.COLUMN_OFFSETS['employee_id']
            )
            employee_id = str(emp_id_cell.value or '').strip()

            if not employee_id or not employee_id.isdigit():
                return None

            # Extract numeric data from fixed row positions
            data = {
                'employee_id': employee_id,
                'period': period,
                'work_days': self._get_numeric(ws, self.ROW_POSITIONS['work_days'], base_col + self.COLUMN_OFFSETS['work_days']),
                'paid_leave_days': self._get_numeric(ws, self.ROW_POSITIONS['paid_leave_days'], base_col + self.COLUMN_OFFSETS['paid_leave_days']),
                'work_hours': self._get_numeric(ws, self.ROW_POSITIONS['work_hours'], base_col + self.COLUMN_OFFSETS['work_hours']),
                'overtime_hours': self._get_numeric(ws, self.ROW_POSITIONS['overtime_hours'], base_col + self.COLUMN_OFFSETS['overtime_hours']),
                'base_salary': self._get_numeric(ws, self.ROW_POSITIONS['base_salary'], base_col + self.COLUMN_OFFSETS['base_salary']),
                'overtime_pay': self._get_numeric(ws, self.ROW_POSITIONS['overtime_pay'], base_col + self.COLUMN_OFFSETS['overtime_pay']),
                'other_allowances': self._get_numeric(ws, self.ROW_POSITIONS['other_allowances'], base_col + self.COLUMN_OFFSETS['other_allowances']),
                'transport_allowance': self._get_numeric(ws, self.ROW_POSITIONS['transport_allowance'], base_col + self.COLUMN_OFFSETS['transport_allowance']),
                'net_salary': self._get_numeric(ws, self.ROW_POSITIONS['net_salary'], base_col + self.COLUMN_OFFSETS['net_salary']),

                # Fields with defaults
                'paid_leave_hours': 0,
                'social_insurance': 0,
                'employment_insurance': 0,
                'income_tax': 0,
                'resident_tax': 0,
                'other_deductions': 0,
                'billing_amount': 0,  # Will be calculated from employee billing_rate
            }

            # Calculate gross_salary if possible
            data['gross_salary'] = (
                data['base_salary'] +
                data['overtime_pay'] +
                data['other_allowances'] +
                data['transport_allowance']
            )

            # Create and return PayrollRecordCreate
            return PayrollRecordCreate(**data)

        except Exception as e:
            # Silently return None - employee data may not be valid at this position
            return None

    def _parse_period(self, value) -> str:
        """
        Convert period string format '2025年1月分(2月17日支給)' to '2025年1月'

        Args:
            value: Raw period value from Excel cell

        Returns:
            Formatted period string (YYYY年M月) or empty string if parsing fails
        """
        if value is None or value == '':
            return ''

        value_str = str(value)

        # Match pattern: 年 followed by digits, then 月
        match = re.search(r'(\d{4})年(\d{1,2})月', value_str)
        if match:
            year = match.group(1)
            month = match.group(2).zfill(2)  # Pad with zero if needed
            return f"{year}年{int(month)}月"  # Remove padding for standard format

        return ''

    def _get_numeric(self, ws, row: int, col: int) -> float:
        """
        Safely extract numeric value from a cell

        Args:
            ws: openpyxl worksheet
            row: Row number (1-indexed)
            col: Column number (1-indexed)

        Returns:
            Float value or 0.0 if cell is empty or not numeric
        """
        try:
            cell = ws.cell(row=row, column=col)
            value = cell.value

            if value is None or value == '':
                return 0.0

            # Handle different numeric types
            if isinstance(value, (int, float)):
                return float(value)

            # Try to convert string to float
            value_str = str(value).strip()
            if not value_str:
                return 0.0

            return float(value_str)

        except (ValueError, TypeError, AttributeError):
            # Return 0 if conversion fails
            return 0.0
