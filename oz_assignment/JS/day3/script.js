// ============================================
// 1. 전역 상태 (State)
//    - 화면이 지금 어떤 상황인지 기억해두는 변수들
// ============================================

const API_URL = "https://api4.binance.com/api/v3/ticker/24hr";

let allCoins = [];        // API에서 받아온 전체 코인 데이터 (가공 전)
let currentTab = "all";   // "all" 이면 전체보기, "fav" 면 관심목록
let searchKeyword = "";   // 검색창에 입력된 글자

// LocalStorage에서 관심목록을 불러온다. 없으면 빈 배열([])로 시작.
// localStorage는 문자열만 저장할 수 있어서, 저장할 땐 JSON.stringify,
// 불러올 땐 JSON.parse로 배열 <-> 문자열을 변환해준다.
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];


// ============================================
// 2. DOM 요소 가져오기
// ============================================

const tableBody = document.getElementById("tableBody");
const tabAllBtn = document.getElementById("tabAll");
const tabFavBtn = document.getElementById("tabFav");
const searchInput = document.getElementById("searchInput");


// ============================================
// 3. API 호출 함수
//    - 1초마다 이 함수가 실행되어 최신 가격을 받아온다
// ============================================

async function fetchPrices() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // 필수 요구사항: USDT로 끝나는 심볼만 남긴다.
    // 예: BTCUSDT (O), BTCKRW (X), BTCETH (X)
    allCoins = data.filter((coin) => coin.symbol.endsWith("USDT"));

    render(); // 데이터가 새로 오면 화면을 다시 그린다
  } catch (error) {
    console.error("가격 정보를 가져오는 데 실패했습니다:", error);
    tableBody.innerHTML = `<tr><td colspan="6" class="empty">데이터를 불러오지 못했습니다. 잠시 후 다시 시도합니다.</td></tr>`;
  }
}


// ============================================
// 4. 화면 그리기 함수
//    - allCoins를 그대로 그리지 않고,
//      "지금 탭" + "검색어" 조건에 맞게 걸러서(filter) 그린다
// ============================================

function render() {
  // 1) 탭 필터링: 관심목록 탭이면 즐겨찾기한 것만 남긴다
  let list = allCoins;
  if (currentTab === "fav") {
    list = list.filter((coin) => favorites.includes(coin.symbol));
  }

  // 2) 검색 필터링: 검색어가 포함된 심볼만 남긴다 (대소문자 무시)
  if (searchKeyword) {
    list = list.filter((coin) =>
      coin.symbol.toLowerCase().includes(searchKeyword.toLowerCase())
    );
  }

  // 3) 결과가 없으면 안내 문구
  if (list.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty">표시할 데이터가 없습니다.</td></tr>`;
    return;
  }

  // 4) 각 코인 데이터를 <tr> 문자열로 변환해서 한 번에 삽입
  //    (매초 innerHTML을 새로 통째로 바꾸는 방식 - 가장 단순하고 이해하기 쉬운 방법)
  tableBody.innerHTML = list
    .map((coin) => {
      const isFav = favorites.includes(coin.symbol);
      const changePercent = parseFloat(coin.priceChangePercent);

      // 상승/하락/보합에 따라 색깔 클래스를 다르게 준다
      let changeClass = "flat";
      if (changePercent > 0) changeClass = "up";
      if (changePercent < 0) changeClass = "down";

      const sign = changePercent > 0 ? "+" : ""; // 양수일 때만 + 기호 붙이기

      return `
        <tr>
          <td class="col-star">
            <button class="star-btn ${isFav ? "active" : ""}" data-symbol="${coin.symbol}">
              ${isFav ? "★" : "☆"}
            </button>
          </td>
          <td class="col-symbol">${coin.symbol}</td>
          <td class="col-num">${formatNumber(coin.lastPrice)}</td>
          <td class="col-num ${changeClass}">${sign}${changePercent.toFixed(2)}%</td>
          <td class="col-num">${formatNumber(coin.highPrice)}</td>
          <td class="col-num">${formatNumber(coin.lowPrice)}</td>
        </tr>
      `;
    })
    .join("");
}

// 숫자를 보기 좋게 다듬는 함수 (소수점 너무 길면 잘라줌)
function formatNumber(value) {
  const num = parseFloat(value);
  if (num >= 1) return num.toFixed(2);
  return num.toFixed(4);
}


// ============================================
// 5. 이벤트 리스너 연결
//    - 사용자가 클릭/입력할 때 상태(state)를 바꾸고 render() 재호출
// ============================================

// 탭 전환
tabAllBtn.addEventListener("click", () => {
  currentTab = "all";
  tabAllBtn.classList.add("active");
  tabFavBtn.classList.remove("active");
  render();
});

tabFavBtn.addEventListener("click", () => {
  currentTab = "fav";
  tabFavBtn.classList.add("active");
  tabAllBtn.classList.remove("active");
  render();
});

// 검색창 입력
searchInput.addEventListener("input", (e) => {
  searchKeyword = e.target.value.trim();
  render();
});

// 별(★) 버튼 클릭 - 이벤트 위임(delegation) 방식 사용
// tbody 안의 버튼들은 render()가 실행될 때마다 새로 생성되므로,
// 버튼 하나하나에 직접 이벤트를 다는 대신 부모(tableBody)에 한 번만 걸어둔다.
tableBody.addEventListener("click", (e) => {
  if (!e.target.classList.contains("star-btn")) return;

  const symbol = e.target.dataset.symbol;

  if (favorites.includes(symbol)) {
    // 이미 관심목록에 있으면 제거
    favorites = favorites.filter((s) => s !== symbol);
  } else {
    // 없으면 추가
    favorites.push(symbol);
  }

  // 변경된 관심목록을 LocalStorage에 저장 (새로고침해도 유지되도록)
  localStorage.setItem("favorites", JSON.stringify(favorites));

  render();
});


// ============================================
// 6. 시작하기
// ============================================

fetchPrices();                  // 페이지가 열리자마자 한 번 즉시 호출
setInterval(fetchPrices, 1000); // 이후 1초마다 반복 호출
