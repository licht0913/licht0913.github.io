# 5. 리스트와 모듈 연습
import random  # 랜덤 기능을 위한 모듈 가져오기

menus = ["김치찌개", "돈까스", "짜장면", "햄버거", "초밥"]  # 메뉴 리스트 만들기

print("오늘의 추천 메뉴 후보:", menus)

# 랜덤으로 하나 선택
choice = random.choice(menus)
print(f"오늘 점심은 '{choice}' 어떠세요?")
