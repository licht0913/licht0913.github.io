# 3. 반복문(for) 연습 - 구구단
print("구구단을 외자!")

for i in range(2, 10):  # 2부터 9까지 반복
    print(f"=== {i}단 ===")
    for j in range(1, 10):  # 1부터 9까지 반복
        print(f"{i} x {j} = {i * j}")
    print("")  # 단 사이에 빈 줄 추가
