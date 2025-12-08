"""
Specialized parser for .xlsm salary statement files (給与明細)

Handles complex multi-sheet, multi-employee layout where:
- Each file has multiple sheets (1 summary + 25 company sheets)
- Each company sheet has multiple employees side-by-side
- Each employee occupies ~14 columns with data in fixed row positions

Multipliers for billing calculation:
- 基本時間: 単価 × hours
- 残業 (≤60h): 単価 × 1.25
- 残業 (>60h): 単価 × 1.5
- 深夜 (factory): 単価 × 1.25 (extra 0.25 on top of regular)
- 休日: 単価 × 1.35
"""

import openpyxl
import re
from typing import List, Optional, Dict, Any
from io import BytesIO
from models import PayrollRecordCreate


class SalaryStatementParser:
    """Parser for complex .xlsm salary statement files (給与明細)"""

    # Each employee occupies this many columns width
    EMPLOYEE_COLUMN_WIDTH = 14

    # Row positions for data extraction (1-indexed)
    # ================================================
    # IMPORTANT: Adjust these values based on your actual Excel structure
    # You can check your Excel file and modify the row numbers here
    # ================================================
    ROW_POSITIONS = {
        # Header info
        'period': 5,              # "2025年1月分(2月17日支給)"
        'employee_id': 6,         # 6-digit employee ID
        'name': 7,                # Employee name

        # Time data (時間データ)
        'work_days': 11,          # 出勤日数
        'paid_leave_days': 12,    # 有給日数
        'work_hours': 13,         # 労働時間 (normal hours)
        'overtime_hours': 14,     # 残業時間 (≤60h)
        'night_hours': 15,        # 深夜時間 (if available, otherwise 0)
        'holiday_hours': 16,      # 休日時間 (if available, otherwise 0)
        'overtime_over_60h': 17,  # 60H過残業 (if available, otherwise 0)

        # Salary amounts (給与)
        'base_salary': 18,        # 基本給
        'overtime_pay': 19,       # 残業代 (≤60h × 1.25)
        'night_pay': 20,          # 深夜手当 (本人: ×0.25)
        'holiday_pay': 21,        # 休日手当 (×1.35)
        'overtime_over_60h_pay': 22,  # 60H過残業手当 (×1.5)
        'other_allowances': 23,   # その他手当
        'transport_allowance': 24,  # 通勤費
        'paid_leave_amount': 25,  # 有給金額 (direct value)

        # Deductions (控除)
        'social_insurance': 26,   # 社会保険
        'employment_insurance': 27,  # 雇用保険
        'income_tax': 28,         # 所得税
        'resident_tax': 29,       # 住民税

        # Totals
        'gross_salary': 30,       # 総支給額
        'net_salary': 31,         # 差引支給額
    }

    # Column offsets within an employee block
    # First employee block starts at col 1, employee_id at col 10
    # So offset = 9
    COLUMN_OFFSETS = {
        'period': 2,              # col 3 - base 1
        'employee_id': 9,         # col 10 - base 1
        'name': 2,                # col 3 - base 1
        'work_days': 5,           # col 6 - base 1
        'paid_leave_days': 10,    # col 11 - base 1
        'work_hours': 3,          # col 4 - base 1
        'overtime_hours': 3,
        'night_hours': 3,
        'holiday_hours': 3,
        'overtime_over_60h': 3,
        'base_salary': 3,
        'overtime_pay': 3,
        'night_pay': 3,
        'holiday_pay': 3,
        'overtime_over_60h_pay': 3,
        'other_allowances': 3,
        'transport_allowance': 3,
        'paid_leave_amount': 3,
        'social_insurance': 3,
        'employment_insurance': 3,
        'income_tax': 3,
        'resident_tax': 3,
        'gross_salary': 3,
        'net_salary': 3,
    }

    # Alternative row positions for ChinginGenerator format
    # These are the actual rows from the images (IMG_7706, IMG_7707)
    ROW_POSITIONS_CHINGIN = {
        'period': 5,
        'employee_id': 6,
        'name': 7,
        'work_days': 11,
        'paid_leave_days': 12,
        'work_hours': 13,         # 労働時間
        'overtime_hours': 14,     # 残業時間
        'base_salary': 16,        # 基本給
        'overtime_pay': 17,       # 残業代
        'other_allowances': 18,   # その他手当
        'transport_allowance': 21,  # 通勤費
        'net_salary': 30,         # 差引支給額
    }

    def __init__(self, use_chingin_format: bool = True):
        """
        Initialize parser

        Args:
            use_chingin_format: If True, use ChinginGenerator row positions
        """
        self.use_chingin_format = use_chingin_format
        if use_chingin_format:
            # Merge ChinginGenerator positions with defaults
            for key, value in self.ROW_POSITIONS_CHINGIN.items():
                self.ROW_POSITIONS[key] = value

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

        print(f"📊 Parsed {len(records)} employee records from Excel")
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

            # Extract time data
            work_hours = self._get_value(ws, 'work_hours', base_col)
            overtime_hours = self._get_value(ws, 'overtime_hours', base_col)
            night_hours = self._get_value(ws, 'night_hours', base_col)
            holiday_hours = self._get_value(ws, 'holiday_hours', base_col)
            overtime_over_60h = self._get_value(ws, 'overtime_over_60h', base_col)

            # Extract salary data
            base_salary = self._get_value(ws, 'base_salary', base_col)
            overtime_pay = self._get_value(ws, 'overtime_pay', base_col)
            night_pay = self._get_value(ws, 'night_pay', base_col)
            holiday_pay = self._get_value(ws, 'holiday_pay', base_col)
            overtime_over_60h_pay = self._get_value(ws, 'overtime_over_60h_pay', base_col)
            other_allowances = self._get_value(ws, 'other_allowances', base_col)
            transport_allowance = self._get_value(ws, 'transport_allowance', base_col)
            paid_leave_amount = self._get_value(ws, 'paid_leave_amount', base_col)

            # Extract deductions
            social_insurance = self._get_value(ws, 'social_insurance', base_col)
            employment_insurance = self._get_value(ws, 'employment_insurance', base_col)
            income_tax = self._get_value(ws, 'income_tax', base_col)
            resident_tax = self._get_value(ws, 'resident_tax', base_col)

            # Extract days
            work_days = self._get_value(ws, 'work_days', base_col)
            paid_leave_days = self._get_value(ws, 'paid_leave_days', base_col)

            # Get gross_salary from Excel if available, otherwise calculate
            gross_salary_excel = self._get_value(ws, 'gross_salary', base_col)
            if gross_salary_excel > 0:
                gross_salary = gross_salary_excel
            else:
                gross_salary = (
                    base_salary +
                    overtime_pay +
                    night_pay +
                    holiday_pay +
                    overtime_over_60h_pay +
                    other_allowances +
                    transport_allowance
                )

            net_salary = self._get_value(ws, 'net_salary', base_col)

            # Calculate paid_leave_hours from days (8 hours per day)
            paid_leave_hours = paid_leave_days * 8 if paid_leave_days > 0 else 0

            data = {
                'employee_id': employee_id,
                'period': period,

                # Time data
                'work_days': int(work_days),
                'work_hours': work_hours,
                'overtime_hours': overtime_hours,
                'night_hours': night_hours,
                'holiday_hours': holiday_hours,
                'overtime_over_60h': overtime_over_60h,
                'paid_leave_days': paid_leave_days,
                'paid_leave_hours': paid_leave_hours,
                'paid_leave_amount': paid_leave_amount,

                # Salary
                'base_salary': base_salary,
                'overtime_pay': overtime_pay,
                'night_pay': night_pay,
                'holiday_pay': holiday_pay,
                'overtime_over_60h_pay': overtime_over_60h_pay,
                'other_allowances': other_allowances,
                'transport_allowance': transport_allowance,
                'gross_salary': gross_salary,

                # Deductions
                'social_insurance': social_insurance,
                'employment_insurance': employment_insurance,
                'income_tax': income_tax,
                'resident_tax': resident_tax,
                'other_deductions': 0,
                'net_salary': net_salary,

                # Billing will be calculated by services.py using employee's 単価
                'billing_amount': 0,
            }

            return PayrollRecordCreate(**data)

        except Exception as e:
            print(f"  Warning: Error extracting data at column {base_col}: {e}")
            return None

    def _get_value(self, ws, field: str, base_col: int) -> float:
        """
        Get numeric value from a field

        Args:
            ws: openpyxl worksheet
            field: Field name from ROW_POSITIONS
            base_col: Base column for employee block

        Returns:
            Float value or 0.0 if not found
        """
        if field not in self.ROW_POSITIONS:
            return 0.0

        row = self.ROW_POSITIONS[field]
        col_offset = self.COLUMN_OFFSETS.get(field, 3)  # Default offset 3
        col = base_col + col_offset

        return self._get_numeric(ws, row, col)

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
            month = match.group(2)
            return f"{year}年{int(month)}月"

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

            # Remove common formatting
            value_str = value_str.replace(',', '').replace('¥', '').replace(' ', '')

            return float(value_str)

        except (ValueError, TypeError, AttributeError):
            return 0.0
