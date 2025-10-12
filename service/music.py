from api.api import music
import requests
import json

def create_music(prompt,tags,title,mv="chirp-v4"):
    url=music()[0]
    headers = music()[1]

    payload = {
        "prompt":prompt,
        "tags": tags,
        "mv": mv,
        "title": title
    }

    response = requests.post(url, headers=headers, json=payload)

    print("状态码:", response.status_code)
    print(response.json())


if __name__ == '__main__':
    create_music("""
    Create a serene and poetic music track inspired by traditional Chinese culture and classical poetry, blended with modern ambient electronic elements.
The music should evoke a sense of elegance, nostalgia, and tranquility, like walking through a misty mountain landscape or reading an ancient poem.
Instruments: guzheng, erhu, bamboo flute, light piano, subtle strings, soft ambient synths.
Mood: calm, reflective, slightly mystical, elegant.
Tempo: slow to moderate, flowing and smooth.
Ideal for a cultural AI app that transforms classical poetry into interactive experiences, suitable as background music for exploration, creation, and contemplation.要求是纯音乐
    ""","古风,中国风","诗境流年")
