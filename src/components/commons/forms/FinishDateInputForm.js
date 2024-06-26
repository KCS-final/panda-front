import React, { useState, useEffect } from 'react';
import { Form, Row, Col } from 'react-bootstrap/';

const FinishDateInputForm = ({ controlId, finishDate, setFinishDate, finishHour, setFinishHour }) => {
  const [minDate, setMinDate] = useState('');

  useEffect(() => {
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    const isoDate = localDate.toISOString().split('T')[0];
    setMinDate(isoDate);
  }, []);

  const generateHourOptions = () => {
    let hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(<option key={i} value={i}>{`${i.toString().padStart(2, '0')}:00`}</option>);
    }
    return hours;
  };

  return (
    <Form.Group as={Row} className="mb-5" controlId={controlId}>
      <Form.Label column xxs={12} sm={3} md={2} className="text-nowrap">
        <span className="text-danger">*&nbsp;</span>
        경매 완료 시간</Form.Label>
      <Col xs={5} sm={4} md={3}>
        <Form.Control
          type="date"
          value={finishDate}
          onChange={(e) => setFinishDate(e.target.value)}
          min={minDate}
        />
      </Col>
      <Col xs={4} sm={3} md={2}>
        <Form.Select
          value={finishHour}
          onChange={(e) => setFinishHour(e.target.value)}
        >
          {generateHourOptions()}
        </Form.Select>
      </Col>
    </Form.Group>
  );
};

export default FinishDateInputForm;
