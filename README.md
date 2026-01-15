# 파이썬 기초 샘플 코드 모음

이 폴더는 파이썬 프로그래밍의 기초 개념을 익힐 수 있는 5가지 샘플 코드를 담고 있습니다.

## 사용 방법

### 방법 1: 웹에서 바로 실행하기 (추천)
별도의 설치 없이 파일 목록에 있는 **[Open In Colab]** 버튼을 누르면 구글 서버에서 코드를 즉시 실행해 볼 수 있습니다.

예시: [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/)

### 방법 2: 내 컴퓨터에서 실행하기
파이썬이 설치된 환경이라면 터미널에서 `python 파일명.py` 명령어로 실행할 수 있습니다.

```bash
cd python_basics
python 01_input_print.py
```

## 파일 목록 및 설명

### 1. [인사하는 프로그램 (01_input_print.py)](./01_input_print.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/licht0913/licht0913.github.io/blob/main/01_input_print.ipynb)
- **학습 개념**: `input()` (입력), `print()` (출력), 변수, f-string 포맷팅
- **내용**: 사용자의 이름과 나이를 입력받아 환영 메시지를 출력합니다.

### 2. [홀수 짝수 판별기 (02_odd_even.py)](./02_odd_even.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/licht0913/licht0913.github.io/blob/main/02_odd_even.ipynb)
- **학습 개념**: `if-else` (조건문), 산술 연산자(`%`)
- **내용**: 숫자를 입력하면 홀수인지 짝수인지 판별해줍니다.

### 3. [구구단 출력하기 (03_gugudan.py)](./03_gugudan.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/licht0913/licht0913.github.io/blob/main/03_gugudan.ipynb)
- **학습 개념**: `for` (반복문), `range()`, 중첩 반복문
- **내용**: 2단부터 9단까지의 구구단을 보기 좋게 출력합니다.

### 4. [간단한 계산기 (04_calculator.py)](./04_calculator.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/licht0913/licht0913.github.io/blob/main/04_calculator.ipynb)
- **학습 개념**: `def` (함수 정의 및 호출), 매개변수와 반환값
- **내용**: 덧셈과 뺄셈을 수행하는 함수를 만들고 사용합니다.

### 5. [점심 메뉴 추천 (05_lunch_menu.py)](./05_lunch_menu.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/licht0913/licht0913.github.io/blob/main/05_lunch_menu.ipynb)
- **학습 개념**: 리스트(List), `import` (모듈 사용), `random`
- **내용**: 리스트에 있는 메뉴 중 하나를 무작위로 골라 추천해줍니다.

### 6. [자기 성적 확인하기 (06_check_score.py)](./06_check_score.ipynb) [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/licht0913/licht0913.github.io/blob/main/06_check_score.ipynb)
- **학습 개념**: `Dictionary` (딕셔너리), `while` (무한 루프), `if-in`, 예외 처리(`try-except`)
- **내용**: 학생 번호를 입력하면 미리 저장된 데이터에서 해당 번호의 과목별 점수와 평균 정보를 찾아 보여주는 검색 프로그램입니다.
