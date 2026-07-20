import pandas as pd

data = {
    "names": ["Anabelle", "Abigail", "Sophia", "John", "Doe"],
    "gender": ["Female", "Female", "Female", "Male", "Male"],
    "age": [20, 21, 19, 18, 22],
    "city": ["Lagos", "Abuja", "Portharcourt", "Calabar", "Enugu"]
}
df = pd.DataFrame(data)


print(df.head(5))