import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import styles from '../../../static/styles/css/ChatWindow.module.css';
import backImg from '../../../static/styles/images/chatback.png';
import { client } from '../../util/client';
import { fetchItems, fetchLikedItems, fetchBidItems } from './Api'; // fetchBidItems 함수 import
import sanitizeHtml from 'sanitize-html'; // sanitize-html 라이브러리를 import

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

function ChatWindow({ roomId, roomTitle, onBackButtonClick }) {
  const [chatMessages, setChatMessages] = useState([]); // 채팅 메시지 상태
  const [stompClient, setStompClient] = useState(null); // STOMP 클라이언트 상태
  const [messageInput, setMessageInput] = useState(''); // 메시지 입력 상태
  const [items, setItems] = useState([]); // 아이템 상태

  const chatContainerRef = useRef(null); // 채팅 컨테이너 참조

  const handleMessageInputChange = (e) => {
    setMessageInput(e.target.value); // 메시지 입력 값 변경
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage(); // Enter 키를 누르면 메시지 전송
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await client.get(`${process.env.REACT_APP_API_URL}/v1/auth/chat/room/content?roomId=${roomId}`);
        console.log("테스트용", response.data.data);

        const messages = response.data.data;
        const newMessages = messages.map(message => ({
          content: message.content,
          chatUser: message.chatUser
        }));

        setChatMessages(prevMessages => [...prevMessages, ...newMessages]); // 새로운 메시지를 기존 메시지 배열에 추가
      } catch (error) {
        console.error('Error fetching chat content:', error); // 에러 처리
      }
    };

    if (roomId !== 'chatbot') {
      fetchData(); // 채팅방 콘텐츠 가져오기
      const socket = new WebSocket(`${process.env.REACT_APP_CHAT_URL}`);
      const stomp = new Client({
        webSocketFactory: () => socket,
        debug: function () {
          console.log.apply(null, arguments); // 디버그 로그
        },
      });
      setStompClient(stomp); // STOMP 클라이언트 설정
    } else {
      const fetchItemsData = async () => {
        try {
          const itemsData = await fetchItems(); // fetchItems 함수 사용
          setItems(Array.isArray(itemsData) ? itemsData : []); // 배열 형태로 변환
          setChatMessages([{ content: '안녕하세요.😊 원하시는게 무엇일까요?', chatUser: 0 }]); // 초기 메시지 설정
        } catch (error) {
          console.error('Error fetching items:', error); // 에러 처리
        }
      };
      fetchItemsData(); // 아이템 데이터 가져오기
    }

    return () => {
      if (stompClient !== null) {
        stompClient.deactivate(); // STOMP 클라이언트 비활성화
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (stompClient) {
      stompClient.onConnect = () => {
        console.log('WebSocket 연결됨');
        if (roomId !== 'chatbot') {
          stompClient.subscribe(`/room/${roomId}`, (message) => {
            const receivedMessage = JSON.parse(message.body);
            setChatMessages((prevMessages) => [...prevMessages, receivedMessage]); // 새로운 메시지 추가
          });
        }
      };

      stompClient.activate(); // STOMP 클라이언트 활성화
    }
  }, [stompClient, roomId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; // 새로운 메시지가 추가되면 스크롤을 아래로
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    const userId = localStorage.getItem("id");
    if (messageInput.trim() !== '') {
      if (roomId === 'chatbot') {
        const userMessage = { content: messageInput, chatUser: userId };
        setChatMessages((prevMessages) => [...prevMessages, userMessage]);

        try {
          // Google Generative AI 사용 설정
          const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: "너는 이커머스 사이트에서 귀여운 챗봇 역할을 할거야. 너의 컨셉은 아기 판다야. 150자 이내로 최대한 간단하게 대답해줘. 귀엽고 친절하게 대응해줘.존댓말로해주고,가능한 가시적으로 잘보이게 출력해줘. 그리고 우리 사이트에 있는 현재 물품의 내용은 다음과 같아. 고객이 원하는 내용을 상담해주면 돼. 그리고 고객이 찜한 목록을 달라하면 *찜* 이렇게만 나한테 보내줘. 내가 그럼 찜한목록을 너한테보내줄게. 만약 입찰 목록을 원한다면 *입찰목록* 이렇게 보내줘.",
          });

          const generationConfig = {
            temperature: 1,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 1000000,
            responseMimeType: "text/plain",
          };

          const itemMessages = items.map(item => `<a href="https://web.52pandas.com/detail?itemId=${item.itemId}">${item.title}</a>`).join('<br/>');
          const fullMessage = `아이템 목록:\n${itemMessages}\n\n고객 메시지: ${messageInput}\n\n링크는 하이퍼링크로 전달해줘.`;

          const chatHistory = [
            { role: "user", parts: [{ text: fullMessage }]}
          ];

          const chatSession = model.startChat({
            generationConfig,
            history: chatHistory,
          });

          const result = await chatSession.sendMessage(fullMessage);
          const response = await result.response.text();

          if (response.includes('*찜*')) {
            const likedItems = await fetchLikedItems(); // 찜한 목록 가져오기
            const likedItemsMessage = likedItems.map(item => `<a href="https://web.52pandas.com/detail?itemId=${item.itemId}">${item.itemTitle}</a>`).join('<br/>');
            const fullResponseMessage = `${response.replace('*찜*', '')}\n\n찜한 목록:\n${likedItemsMessage}`;

            const botMessage = { content: `오이바오: ${fullResponseMessage}`, chatUser: '0' };
            setChatMessages((prevMessages) => [...prevMessages, botMessage]); // 챗봇 메시지 추가
          } else if (response.includes('*입찰목록*')) {
            const bidItems = await fetchBidItems(); // 입찰한 목록 가져오기
            const bidItemsMessage = bidItems.map(item => `<a href="https://web.52pandas.com/detail?itemId=${item.itemId}">${item.itemTitle}</a>`).join('<br/>');
            const fullResponseMessage = `${response.replace('*입찰목록*', '')}\n\n입찰한 목록:\n${bidItemsMessage}`;

            const botMessage = { content: `오이바오: ${fullResponseMessage}`, chatUser: '0' };
            setChatMessages((prevMessages) => [...prevMessages, botMessage]); // 챗봇 메시지 추가
          } else {
            const botMessage = { content: `오이바오: ${response}`, chatUser: '0' };
            setChatMessages((prevMessages) => [...prevMessages, botMessage]); // 챗봇 메시지 추가
          }
        } catch (error) {
          console.error('Error sending message to Gemini:', error); // 에러 처리
        }
      } else {
        stompClient.publish({ destination: `/message/${roomId}`, body: JSON.stringify({ content: messageInput, chatUser: userId }) }); // 메시지 전송
      }
      setMessageInput(''); // 메시지 입력 필드 초기화
    }
  };

  const handleBackButtonClick = () => {
    onBackButtonClick(); // 뒤로가기 버튼 클릭 핸들러
  };

  return (
    <div>
      <div className={styles.chatTitle}>
        <img className={styles.backImg} src={backImg} alt="뒤로가기" onClick={handleBackButtonClick} />
        <h3>{roomTitle}</h3>
      </div>
      <div className={styles.chatContainer} ref={chatContainerRef}>
        {chatMessages.map((message, index) => (
          <div 
            key={index} 
            className={`${styles.chatBubble} ${message.chatUser === localStorage.getItem("id") ? styles.right : styles.left}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(message.content, { allowedTags: ['a'], allowedAttributes: { 'a': ['href'] } }) }} // HTML을 안전하게 렌더링
          />
        ))}
      </div>
      <div className={styles.inputContainer}>
        <input 
          className={styles.input}
          type="text" 
          value={messageInput} 
          onChange={handleMessageInputChange}
          onKeyDown={handleKeyPress} 
          placeholder="메시지를 입력하세요" />
        <button onClick={handleSendMessage} className={styles.sendBtn}>전송</button>
      </div>
    </div>
  );
}

export default ChatWindow;
