import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../../../static/styles/css/PriceList.module.css';

function PriceList({ productData, isPopupVisible }) {
  const [items, setItems] = useState([]); // 서버에서 받은 입찰 정보를 저장할 상태
  const [currentPrice, setCurrentPrice] = useState('0원'); // 최고 가격 상태

  useEffect(() => {
    const fetchBids = async () => {
      console.log("API 요청 시작: 입찰 정보 불러오기"); // 로그 출력
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/auth/auction/item/${productData.itemId}/bid`);
        console.log("API 응답:", response); // API 응답 로그 출력
        if (response.data.success) {
          const sortedItems = response.data.data.info.sort((a, b) => {
            // 가격을 내림차순으로 정렬하고, 같은 가격일 경우 이름을 사전 순으로 정렬
            if (b.price - a.price !== 0) {
              return b.price - a.price;
            } else {
              return a.name.localeCompare(b.name);
            }
          });
          setItems(sortedItems); // 정렬된 입찰 정보를 상태에 저장
          if (sortedItems.length > 0) {
            setCurrentPrice(sortedItems[0].price.toLocaleString() + '원'); // 배열의 첫 번째 요소 가격을 최고 가격으로 설정
          }
        }
      } catch (error) {
        console.error('입찰 정보 불러오기 실패:', error);
      }
    };
  
    if (isPopupVisible && productData && productData.itemId) {
      fetchBids(); // 모달이 보일 때 데이터 불러오기
    }
  }, [isPopupVisible, productData]); // isPopupVisible 또는 productData가 변경될 때마다 다시 불러오기

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.currentPriceTitle}>현재 가격</span>
        <span className={styles.currentPrice}>{currentPrice}</span>
      </div>
      <div className={styles.itemList}>
        {items.slice(0, 4).map((item, index) => (
          <div key={index} className={styles.item}>
            <span className={styles.itemName}>{item.name}</span>
            <span className={styles.itemPrice}>{item.price.toLocaleString()}원</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PriceList;
