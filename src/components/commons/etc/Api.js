// src/api/openai.js
import axios from 'axios';
import { client } from '../../util/client';

const apiKey = process.env.REACT_APP_OPENAI_API_KEY; // OpenAI API 키 설정

const openai = axios.create({
  baseURL: 'https://api.openai.com/v1', // OpenAI API 기본 URL
  headers: {
    'Content-Type': 'application/json', // JSON 형식의 컨텐츠 타입 설정
    'Authorization': `Bearer ${apiKey}` // 인증 헤더에 API 키 추가
  }
});

// OpenAI API에 메시지를 보내는 함수
export const sendMessage = async (message) => {
  const response = await openai.post('/chat/completions', {
    model: 'gpt-4o', // 사용할 모델 설정
    messages: [{ role: 'user', content: message }], // 사용자의 메시지 설정
  });
  return response.data.choices[0].message.content; // 응답 메시지 반환
};

// 백엔드 API로부터 아이템 목록을 가져오는 함수
export const fetchItems = async () => {
  const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/no-auth/chatBot`);
  return response.data; // 응답 데이터 반환
};

// 찜 목록을 가져오는 함수
export const fetchLikedItems = async () => {
  const response = await client.get(`${process.env.REACT_APP_API_URL}/v1/auth/mypage/like`);
  return response.data; // 응답 데이터 반환
};

// 입찰 목록을 가져오는 함수
export const fetchBidItems = async () => {
  const response = await client.get(`${process.env.REACT_APP_API_URL}/v1/auth/mypage/bid`);
  return response.data; // 응답 데이터 반환
};
