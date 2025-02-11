import boto3
from decimal import Decimal
from prettytable import PrettyTable
from tqdm import tqdm
import pandas as pd

# Constants
FREE_TIER_RCU = 25
FREE_TIER_WCU = 25
FREE_TIER_STORAGE_GB = 25

def calculate_free_tier_usage(rcu, wcu, storage_gb):
    """Calculate the free tier usage for the given provisioned capacity and storage."""
    rcu_usage = min(rcu, FREE_TIER_RCU)
    wcu_usage = min(wcu, FREE_TIER_WCU)
    storage_usage = min(storage_gb, FREE_TIER_STORAGE_GB)
    return rcu_usage, wcu_usage, storage_usage

def main():
    total_rcu_usage = 0
    total_wcu_usage = 0
    total_storage_usage = 0
    regions = ['us-east-1', 'us-west-1', 'us-east-2', 'us-west-2']
    table = PrettyTable()
    table.field_names = ["Region", "Table Name", "Provisioned RCU", "Provisioned WCU", "Storage (GB)", "RCU Free Tier Usage", "WCU Free Tier Usage", "Storage Free Tier Usage (GB)"]

    # DataFrame to store region-wise totals
    df_totals = pd.DataFrame(columns=table.field_names)

    for region in regions:
        dynamodb = boto3.client('dynamodb', region_name=region)
        tables = dynamodb.list_tables()['TableNames']

        print(f"Processing tables in region: {region}")

        region_rcu_total = 0
        region_wcu_total = 0
        region_storage_total = 0
        region_rcu_free_total = 0
        region_wcu_free_total = 0
        region_storage_free_total = 0

        for table_name in tqdm(tables, desc=f"Region {region}"):
            table_desc = dynamodb.describe_table(TableName=table_name)['Table']
            rcu = table_desc['ProvisionedThroughput']['ReadCapacityUnits']
            wcu = table_desc['ProvisionedThroughput']['WriteCapacityUnits']
            storage_gb = table_desc['TableSizeBytes'] / (1024 ** 3)  # Convert bytes to GB

            rcu_usage, wcu_usage, storage_usage = calculate_free_tier_usage(rcu, wcu, storage_gb)
            total_rcu_usage += rcu_usage
            total_wcu_usage += wcu_usage
            total_storage_usage += storage_usage

            region_rcu_total += rcu
            region_wcu_total += wcu
            region_storage_total += storage_gb
            region_rcu_free_total += rcu_usage
            region_wcu_free_total += wcu_usage
            region_storage_free_total += storage_usage

            table.add_row([region, table_name, rcu, wcu, f"{storage_gb:.2f}", rcu_usage, wcu_usage, f"{storage_usage:.2f}"])

        # Append region totals to DataFrame
        region_totals = pd.DataFrame([{
            "Region": region,
            "Provisioned RCU": region_rcu_total,
            "Provisioned WCU": region_wcu_total,
            "Storage (GB)": region_storage_total,
            "RCU Free Tier Usage": region_rcu_free_total,
            "WCU Free Tier Usage": region_wcu_free_total,
            "Storage Free Tier Usage (GB)": region_storage_free_total
        }])
        df_totals = pd.concat([df_totals, region_totals])

    # Add region totals to the table
    for _, row in df_totals.iterrows():
        table.add_row([row["Region"], "Total", row["Provisioned RCU"], row["Provisioned WCU"], f"{row['Storage (GB)']:.2f}", row["RCU Free Tier Usage"], row["WCU Free Tier Usage"], f"{row['Storage Free Tier Usage (GB)']:.2f}"])

    print(table)
    print(f"Total Free Tier RCU Usage: {total_rcu_usage} / {FREE_TIER_RCU}")
    print(f"Total Free Tier WCU Usage: {total_wcu_usage} / {FREE_TIER_WCU}")
    print(f"Total Free Tier Storage Usage: {total_storage_usage:.2f} GB / {FREE_TIER_STORAGE_GB} GB")

if __name__ == "__main__":
    main()
