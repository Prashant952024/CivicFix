#!/usr/bin/env python3
"""
CivicFix — Infrastructure Datasets (D1 to D7) Migration Generator
=================================================================
Generates clean sequential migrations from the existing ingest modules:
- 0066_seed_d1_demographics.sql
- 0067_seed_d3_geography.sql
- 0068_seed_d5_accessibility.sql
- 0069_seed_d6_socioeconomic.sql
- 0070_seed_d4_infrastructure.sql
- 0071_seed_d7_historical_projects.sql
- 0072_seed_d2_budget.sql
"""

import os
import shutil

def main():
    # 1. Run each ingest script to ensure seed_d*.sql are up to date
    os.system("python3 scripts/ingest_d1_demographics.py")
    os.system("python3 scripts/ingest_d3_geography.py")
    os.system("python3 scripts/ingest_d5_accessibility.py")
    os.system("python3 scripts/ingest_d6_socioeconomic.py")
    os.system("python3 scripts/ingest_d4_infrastructure.py")
    os.system("python3 scripts/ingest_d7_historical_projects.py")
    os.system("python3 scripts/ingest_d2_budget.py")

    # 2. Extract D1 Demographics (strip districts master which was already seeded in 0064)
    with open("scripts/seed_d1_demographics.sql", "r", encoding="utf-8") as f:
        d1_lines = f.readlines()
    
    # Keep only lines starting from PART 2: CANONICAL D1 POPULATION & DEMOGRAPHICS
    d1_clean = ["-- Migration 0066: Seed D1 Demographics Baseline\n", "BEGIN;\n"]
    in_d1 = False
    for line in d1_lines:
        if "2. CANONICAL D1 POPULATION & DEMOGRAPHICS" in line:
            in_d1 = True
        if in_d1:
            d1_clean.append(line)
    
    with open("supabase/migrations/0066_seed_d1_demographics.sql", "w", encoding="utf-8") as f:
        f.writelines(d1_clean)
    print("Created supabase/migrations/0066_seed_d1_demographics.sql")

    # 3. Copy D3 Geography
    shutil.copyfile("scripts/seed_d3_geography.sql", "supabase/migrations/0067_seed_d3_geography.sql")
    print("Created supabase/migrations/0067_seed_d3_geography.sql")

    # 4. Copy D5 Accessibility
    shutil.copyfile("scripts/seed_d5_accessibility.sql", "supabase/migrations/0068_seed_d5_accessibility.sql")
    print("Created supabase/migrations/0068_seed_d5_accessibility.sql")

    # 5. Copy D6 Socioeconomic
    shutil.copyfile("scripts/seed_d6_socioeconomic.sql", "supabase/migrations/0069_seed_d6_socioeconomic.sql")
    print("Created supabase/migrations/0069_seed_d6_socioeconomic.sql")

    # 6. Copy D4 Infrastructure
    shutil.copyfile("scripts/seed_d4_infrastructure.sql", "supabase/migrations/0070_seed_d4_infrastructure.sql")
    print("Created supabase/migrations/0070_seed_d4_infrastructure.sql")

    # 7. Copy D7 Historical Projects
    shutil.copyfile("scripts/seed_d7_historical_projects.sql", "supabase/migrations/0071_seed_d7_historical_projects.sql")
    print("Created supabase/migrations/0071_seed_d7_historical_projects.sql")

    # 8. Copy D2 Budgets
    shutil.copyfile("scripts/seed_d2_budget.sql", "supabase/migrations/0072_seed_d2_budget.sql")
    print("Created supabase/migrations/0072_seed_d2_budget.sql")

if __name__ == "__main__":
    main()
