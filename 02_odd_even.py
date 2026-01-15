# 2. 조건문(if) 연습
number = int(input("숫자를 입력하세요: "))  # 입력받은 문자를 숫자로 변환

if number % 2 == 0:  # 2로 나눈 나머지가 0이면
    print(f"{number}은(는) 짝수입니다.")
else:
    print(f"{number}은(는) 홀수입니다.")
