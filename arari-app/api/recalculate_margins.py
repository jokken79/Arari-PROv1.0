#!/usr/bin/env python3
"""
Script de recálculo de márgenes (粗利) para datos históricos

Este script recalcula todos los campos derivados usando las tasas correctas:
- 雇用保険（会社負担）: 0.95%
- 労災保険: 0.3%
- 有給コスト: usar paid_leave_amount si existe, sino calcular

Uso:
    python recalculate_margins.py [--dry-run]

Opciones:
    --dry-run    Mostrar cambios sin aplicarlos
"""

import sqlite3
import argparse
from pathlib import Path

# Tasas de seguro (2024年度)
EMPLOYMENT_INSURANCE_RATE = 0.0095  # 雇用保険（会社負担）0.95%
WORKERS_COMP_RATE = 0.003  # 労災保険 0.3%

# Ruta a la base de datos
DB_PATH = Path(__file__).parent / "arari_pro.db"


def recalculate_all_records(dry_run: bool = False):
    """Recalcula todos los registros de nómina con las tasas correctas"""

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Verificar que las columnas necesarias existen
    try:
        cursor.execute("ALTER TABLE payroll_records ADD COLUMN company_workers_comp REAL DEFAULT 0")
        print("✅ Columna company_workers_comp agregada")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE payroll_records ADD COLUMN paid_leave_amount REAL DEFAULT 0")
        print("✅ Columna paid_leave_amount agregada")
    except sqlite3.OperationalError:
        pass

    # Obtener todos los registros con información del empleado
    cursor.execute("""
        SELECT
            p.id,
            p.employee_id,
            p.period,
            p.gross_salary,
            p.social_insurance,
            p.billing_amount,
            p.paid_leave_hours,
            p.paid_leave_amount,
            p.company_social_insurance as old_company_social_insurance,
            p.company_employment_insurance as old_company_employment_insurance,
            p.company_workers_comp as old_company_workers_comp,
            p.total_company_cost as old_total_company_cost,
            p.gross_profit as old_gross_profit,
            p.profit_margin as old_profit_margin,
            e.hourly_rate
        FROM payroll_records p
        LEFT JOIN employees e ON p.employee_id = e.employee_id
        ORDER BY p.period, p.employee_id
    """)

    records = cursor.fetchall()
    print(f"\n📊 Procesando {len(records)} registros...\n")

    updated_count = 0
    skipped_count = 0

    for record in records:
        record_id = record['id']
        employee_id = record['employee_id']
        period = record['period']
        gross_salary = record['gross_salary'] or 0
        social_insurance = record['social_insurance'] or 0
        billing_amount = record['billing_amount'] or 0
        paid_leave_hours = record['paid_leave_hours'] or 0
        paid_leave_amount = record['paid_leave_amount'] or 0
        hourly_rate = record['hourly_rate'] or 0

        if billing_amount == 0:
            skipped_count += 1
            continue

        # Calcular nuevos valores
        # 社会保険（会社負担）= 本人負担と同額
        company_social_insurance = social_insurance

        # 雇用保険（会社負担）= 0.95%
        company_employment_insurance = round(gross_salary * EMPLOYMENT_INSURANCE_RATE)

        # 労災保険 = 0.3%
        company_workers_comp = round(gross_salary * WORKERS_COMP_RATE)

        # 有給コスト: usar valor directo si existe
        if paid_leave_amount > 0:
            paid_leave_cost = paid_leave_amount
        else:
            paid_leave_cost = paid_leave_hours * hourly_rate

        # Costo total (sin duplicar transport_allowance)
        total_company_cost = (
            gross_salary +
            company_social_insurance +
            company_employment_insurance +
            company_workers_comp +
            paid_leave_cost
        )

        # Margen bruto
        gross_profit = billing_amount - total_company_cost
        profit_margin = (gross_profit / billing_amount * 100) if billing_amount > 0 else 0

        # Mostrar cambios
        old_profit = record['old_gross_profit'] or 0
        old_margin = record['old_profit_margin'] or 0

        if abs(gross_profit - old_profit) > 1 or abs(profit_margin - old_margin) > 0.1:
            print(f"📝 {employee_id} ({period}):")
            print(f"   粗利: ¥{old_profit:,.0f} → ¥{gross_profit:,.0f} (差: ¥{gross_profit - old_profit:,.0f})")
            print(f"   マージン: {old_margin:.1f}% → {profit_margin:.1f}%")
            print(f"   [雇用保険: ¥{company_employment_insurance:,}, 労災: ¥{company_workers_comp:,}]")
            print()

            if not dry_run:
                cursor.execute("""
                    UPDATE payroll_records
                    SET company_social_insurance = ?,
                        company_employment_insurance = ?,
                        company_workers_comp = ?,
                        total_company_cost = ?,
                        gross_profit = ?,
                        profit_margin = ?
                    WHERE id = ?
                """, (
                    company_social_insurance,
                    company_employment_insurance,
                    company_workers_comp,
                    total_company_cost,
                    gross_profit,
                    profit_margin,
                    record_id
                ))

            updated_count += 1

    if not dry_run:
        conn.commit()

    conn.close()

    print(f"\n{'=' * 50}")
    print(f"📊 RESUMEN:")
    print(f"   Total registros: {len(records)}")
    print(f"   Actualizados: {updated_count}")
    print(f"   Sin cambios o sin billing_amount: {skipped_count + (len(records) - updated_count - skipped_count)}")

    if dry_run:
        print(f"\n⚠️  MODO DRY-RUN: No se aplicaron cambios")
        print(f"   Ejecuta sin --dry-run para aplicar los cambios")
    else:
        print(f"\n✅ Cambios aplicados exitosamente")


def main():
    parser = argparse.ArgumentParser(description='Recalcular márgenes de datos históricos')
    parser.add_argument('--dry-run', action='store_true',
                       help='Mostrar cambios sin aplicarlos')

    args = parser.parse_args()

    print("=" * 50)
    print("🔄 RECÁLCULO DE MÁRGENES (粗利)")
    print("=" * 50)
    print(f"\nTasas aplicadas (2024年度):")
    print(f"  • 雇用保険（会社負担）: {EMPLOYMENT_INSURANCE_RATE * 100}%")
    print(f"  • 労災保険: {WORKERS_COMP_RATE * 100}%")
    print(f"  • 社会保険（会社負担）: = 本人負担額")

    if args.dry_run:
        print(f"\n⚠️  MODO DRY-RUN: Solo se mostrarán los cambios")

    recalculate_all_records(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
