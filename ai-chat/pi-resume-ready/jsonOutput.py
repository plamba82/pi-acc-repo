import pandas as pd
import json

# Read Excel or CSV
df = pd.read_csv("research.csv")   # use pd.read_excel("file.xlsx") if Excel

contacts = []

for _, row in df.iterrows():
    contacts.append({
        "name": row["name"],
        "email": row["email"],
        "university": row["institution"],
        "department": row["research_areas"]
    })

# Convert to JSON
json_output = json.dumps(contacts, indent=4)

print(json_output)

# Optional: save to file
with open("contacts.json", "w") as f:
    f.write(json_output)