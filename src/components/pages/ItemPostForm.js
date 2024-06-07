import axios from 'axios';
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, InputGroup, Button, ToggleButton, Alert } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../static/styles/css/itemPostForm.module.css';
import { CurrentLocationContext } from '../commons/contexts/CurrentLocationContext';
import LocationPermissionModal from '../commons/modal/LocationPermissionModal';
import ImgInputForm from '../commons/forms/ImgInputForm';
import FinishDateInputForm from '../commons/forms/FinishDateInputForm';
import { client } from '../util/client';

function ItemPostForm() {
  const itemFormApi = `${process.env.REACT_APP_API_URL}/v1/auth/auction/form/`;
  const embeddingApi = 'https://api.openai.com/v1/embeddings';
  const visionApiKey = process.env.REACT_APP_GOOGLE_VISION_API_KEY;
  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;
  const navigate = useNavigate();
  const { address, permissionDenied, locationError } = useContext(CurrentLocationContext);

  const categories = [
    '전자기기', '여성의류', '가구인테리어', '티켓_교환권',
    '남성의류', '액세서리', '생활가전', '생활주방',
    '가공식품', '식물', '반려동물용품', '뷰티_미용',
    '도서_음반', '유아용품', '스포츠_레저', '게임_취미',
    '기타'
  ];

  const [showModal, setShowModal] = useState(false);
  const [itemImgs, setItemImgs] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('전자기기');
  const [startPrice, setStartPrice] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [contents, setContents] = useState('');
  const [finishDate, setFinishDate] = useState('');
  const [finishHour, setFinishHour] = useState('');
  const [direct, setDirectChecked] = useState(false);
  const [parcel, setParcelChecked] = useState(false);
  const [embedding, setEmbedding] = useState(null); // 임베딩 상태 추가
  const [thEmbedding, setThEmbedding] = useState(null); // 썸네일 임베딩 상태 추가
  const [categoryEmbedding, setCategoryEmbedding] = useState(null); // 카테고리 임베딩 추가
  const [detailEmbedding, setDetailEmbedding] = useState(null); // 디테일 임베딩 추가
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permissionDenied || locationError) {
      setShowModal(true);
    }
  }, [permissionDenied, locationError]);

  const handleClose = () => setShowModal(false);

  const handleImageChange = (imageFiles) => {
    setItemImgs(imageFiles);
  };

  const analyzeImage = async (imageFile) => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];
        const requestPayload = {
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
              ],
            },
          ],
        };

        try {
          const response = await axios.post(visionApiUrl, requestPayload);
          const labels = response.data.responses[0].labelAnnotations;
          console.log("Google Vision API Labels:", labels); // 콘솔에 라벨 출력
          const descriptionsList = labels.map(label => label.description);
          resolve(descriptionsList.join(', ')); // OpenAI에 보낼 수 있는 형식으로 변환
        } catch (error) {
          console.error('Error analyzing image:', error);
          reject(error);
        }
      };
      reader.readAsDataURL(imageFile);
    });
  };

  const getEmbedding = async (input) => {
    try {
      const response = await axios.post(
        embeddingApi,
        {
          input: input,
          model: 'text-embedding-ada-002',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          },
        }
      );
      return response.data.data[0].embedding;
    } catch (error) {
      console.error("Error fetching embedding:", error);
      throw error;
    }
  };

  const showErrorAndScroll = (message, elementId) => {
    document.getElementById(elementId).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return message;
  };

  const validateInputs = (trading_method) => {
    if (!title) return showErrorAndScroll("상품명을 입력하세요.", 'item-title');
    if (itemImgs.length === 0) return showErrorAndScroll("하나 이상의 이미지를 업로드해야 합니다.", 'item-title');
    if (!contents) return showErrorAndScroll("상품 설명을 작성해야 합니다.", 'item-detail');
    if (!finishDate || !finishHour) return showErrorAndScroll("경매 마감 시간을 정확히 입력해야 합니다.", 'auction-finish-time');
    if (trading_method === "-1") return showErrorAndScroll("거래 방법을 하나 이상 선택해야 합니다.", 'trading-method');
    if (!startPrice) return showErrorAndScroll("입찰 시작가를 입력해야 합니다.", 'first-price');
    if (buyNowPrice > 0 && buyNowPrice <= startPrice) {
      return showErrorAndScroll("즉시 입찰가는 시작 입찰가보다 높아야 합니다.", 'buynow-price');
    }
    return "";
  };

  const buildFormData = (trading_method) => {
    const formData = new FormData();
    formData.append('address', address);
    itemImgs.forEach((image, index) => formData.append('images', image));
    formData.append('title', title);
    formData.append('category', category);
    formData.append('trading_method', trading_method);
    formData.append('start_price', startPrice);
    if (buyNowPrice > 0) {
      formData.append('buy_now_price', buyNowPrice);
    }
    formData.append('contents', contents);
    formData.append('finish_time', `${finishDate}T${finishHour.padStart(2, '0')}:00`);
    return formData;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    let trading_method = "-1";
    if (direct && parcel) {
      trading_method = "3";
    } else if (direct) {
      trading_method = "1";
    } else if (parcel) {
      trading_method = "2";
    }

    const error = validateInputs(trading_method);
    if (error) {
      setError(error);
      toast.error(error);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = buildFormData(trading_method);
      toast.info("저장하는 중이에요.😊");

      const itemResponse = await client.post(itemFormApi, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // 첫 번째 이미지 분석 요청
      const thumbnailDescription = await analyzeImage(itemImgs[0]);

      // OpenAI 임베딩 요청들
      const embeddingPromises = [
        getEmbedding(contents),
        getEmbedding(thumbnailDescription),
        getEmbedding(category),
        getEmbedding(contents)
      ];

      // 모든 임베딩 요청을 병렬로 처리
      const results = await Promise.allSettled(embeddingPromises);

      const newEmbedding = results[0].status === 'fulfilled' ? results[0].value : null;
      const newThEmbedding = results[1].status === 'fulfilled' ? results[1].value : null;
      const newCategoryEmbedding = results[2].status === 'fulfilled' ? results[2].value : null;
      const newDetailEmbedding = results[3].status === 'fulfilled' ? results[3].value : null;

      setEmbedding(newEmbedding); // 새로운 임베딩 상태 업데이트
      setThEmbedding(newThEmbedding); // 새로운 썸네일 임베딩 상태 업데이트
      setCategoryEmbedding(newCategoryEmbedding); // 새로운 카테고리 임베딩 상태 업데이트
      setDetailEmbedding(newDetailEmbedding); // 새로운 디테일 임베딩 상태 업데이트

      // 임베딩 데이터
      const embeddingData = {
        embedding: newEmbedding,
        thEmbedding: newThEmbedding,
        categoryEmbedding: newCategoryEmbedding, // 카테고리 임베딩 데이터
        detailEmbedding: newDetailEmbedding // 디테일 임베딩 데이터
      };

      try {
        // 임베딩 저장 요청
        await client.post(`${process.env.REACT_APP_API_URL}/v1/auth/auction/embedding`, embeddingData, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (embeddingError) {
        console.error("임베딩 저장에 실패했습니다.", embeddingError);
      }

      toast.success("저장이 완료됐습니다.😊", {
        autoClose: 2000, 
        onClose: () => {
          navigate('/auction');
        }
      });
    } catch (error) {
      toast.error("물품 등록에 실패했습니다.");
      console.error("물품 등록에 실패했습니다.", error);
    }
    setLoading(false);
  };

  return (
    <Container fluid="md px-4" id={styles['input-page-body']}>
      {showModal && <LocationPermissionModal show={showModal} handleClose={handleClose} />}
      <ToastContainer />
      <h2 className={`mt-3 mb-5 ${styles['form-title']}`}>상품 등록</h2>
      <Form onSubmit={handleSubmit}>
        <Row>
          <ImgInputForm controlId="img-upload-form" onImageChange={handleImageChange} />
        </Row>
        <br />
        <Form.Group as={Row} className="mb-4 px-2" controlId="item-title">
          <Form.Control
            type="text"
            placeholder="상품명을 입력하세요"
            name="item-title"
            maxLength="40"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className={styles['text-count']}>{title.length}/40</div>
        </Form.Group>
        <hr />
        <Form.Group as={Row} className="mb-4" controlId="item-category">
          <Form.Label column xs={12} sm={3} md={2} className="text-nowrap">
            <span className="text-danger">*&nbsp;</span>
            카테고리
          </Form.Label>
          <Col xs={8} sm={4}>
            <Form.Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((item, index) => (
                <option key={index} value={item}>{item}</option>
              ))}
            </Form.Select>
          </Col>
        </Form.Group>
        <hr />
        <Form.Group as={Row} className="mb-4" controlId="first-price">
          <Form.Label column xs={12} sm={3} md={2} className="text-nowrap">
            <span className="text-danger">*&nbsp;</span>
            입찰 시작가
          </Form.Label>
          <Col xs={6} sm={4}>
            <InputGroup className="mb-3">
              <InputGroup.Text>₩</InputGroup.Text>
              <Form.Control
                type="number"
                name="first-price"
                value={startPrice}
                min="0"
                onChange={(e) => setStartPrice(parseInt(e.target.value))}
              />
            </InputGroup>
          </Col>
        </Form.Group>
        <Form.Group as={Row} className="mb-4" controlId="buynow-price">
          <Form.Label column xs={12} sm={3} md={2} className="text-nowrap">
            &nbsp;&nbsp;&nbsp;즉시 입찰가
          </Form.Label>
          <Col xs={6} sm={4}>
            <InputGroup className="mb-1">
              <InputGroup.Text>₩</InputGroup.Text>
              <Form.Control
                type="number"
                name="buynow-price"
                value={buyNowPrice}
                min="0"
                onChange={(e) => setBuyNowPrice(parseInt(e.target.value))}
              />
            </InputGroup>
          </Col>
          <Row className='justify-content-start'>
            <Col sm={{ span: 9, offset: 3 }} md={{ span: 10, offset: 2 }}>
              <Form.Text id="buynow-price-text" className='mb-3' muted>
                즉시 입찰가는 공란이거나, 시작 입찰가보다 큰 금액이어야 합니다.
              </Form.Text>
            </Col>
          </Row>
        </Form.Group>
        <hr />
        <FinishDateInputForm
          controlId="auction-finish-time"
          finishDate={finishDate}
          setFinishDate={setFinishDate}
          finishHour={finishHour}
          setFinishHour={setFinishHour}
        />
        <br />
        <Form.Group as={Row} className="mb-4" controlId="trading-method">
          <Form.Label column md={2} className="text-nowrap">
            <span className="text-danger">*&nbsp;</span>
            거래 방법
          </Form.Label>
          <Col sm={5} className={styles['btn-inline-group']}>
            <ToggleButton
              type="checkbox"
              id="direct-check"
              className={direct ? styles['btn-method-active'] : styles['btn-method-inactive']}
              value="1"
              checked={direct}
              onChange={(e) => setDirectChecked(e.currentTarget.checked)}
            >
              직거래
            </ToggleButton>
            <div className="vr" />
            <ToggleButton
              type="checkbox"
              id="parcel-check"
              className={parcel ? styles['btn-method-active'] : styles['btn-method-inactive']}
              value="2"
              checked={parcel}
              onChange={(e) => setParcelChecked(e.currentTarget.checked)}
            >
              택배
            </ToggleButton>
          </Col>
        </Form.Group>
        <hr />
        <Form.Group as={Row} className="mb-4" controlId="item-detail">
          <Form.Label column md={2}>
            <span className="text-danger">*&nbsp;</span>
            상세설명
          </Form.Label>
          <Col>
            <Form.Control
              as="textarea"
              rows="8"
              className={styles['textarea-no-resize']}
              name="item_detail"
              value={contents}
              onChange={(e) => setContents(e.target.value)}
            />
          </Col>
        </Form.Group>
        <Form.Group as={Row} className="mb-4">
          <Col className={`me-3 ${styles['btn-inline-group']} ${styles['justif-content-end']}`}>
            <Button
              variant="success"
              className={styles['cancel-button']}
              onClick={() => window.history.back()}
            >
              취소하기
            </Button>
            <Button
              variant="success"
              className={styles['submit-button']}
              type="submit"
              disabled={loading} // 로딩 중일 때 버튼 비활성화
            >
              {loading ? "등록 중..." : "등록하기"}
            </Button>
          </Col>
        </Form.Group>
      </Form>
      {error && <Alert variant="danger">{error}</Alert>}
    </Container>
  );
}

export default ItemPostForm;
