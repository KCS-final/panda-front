import React, { useState, useEffect } from "react";
import axios from "axios";
import MainPageItemCard from "../card/MainPageItemCard";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import styles from "../../../static/styles/css/mainpageitem.module.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import carouselControlPrev from "../../../static/styles/images/carouselControlPrev.png";
import carouselControlNext from "../../../static/styles/images/carouselControlNext.png";

const CustomNextArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <img
      src={carouselControlNext}
      alt="Next"
      onClick={onClick}
      className={`${className} ${styles.carouselControl}`}
      style={{ ...style, display: "block" }}
    />
  );
};

const CustomPrevArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <img
      src={carouselControlPrev}
      alt="Previous"
      onClick={onClick}
      className={`${className} ${styles.carouselControl}`}
      style={{ ...style, display: "block" }}
    />
  );
};

const MainPageItem = ({ heading }) => {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const baseURL = process.env.REACT_APP_API_URL;
    const endpoint = heading === "New Item" ? "/v1/no-auth/new-item" : "/v1/no-auth/hot-item";
    const url = `${baseURL}${endpoint}`;
  
    axios.get(url)
      .then(response => {
        const data = response.data;
        if (data.success) {
          setItems(data.data.hotItemListDtos.filter(item => item !== null));
        }
      })
      .catch(error => console.error('Error fetching data:', error));
  }, [heading]);

  const handleClick = (itemId) => {
    navigate(`/detail?itemId=${itemId}`);
  };

  const slidesToShow = Math.min(items.length, 4);
  const slidesToScroll = Math.min(items.length, 4);

  const settings = {
    dots: true,
    infinite: items.length > 1,
    speed: 700,
    slidesToShow,
    slidesToScroll,
    autoplay: false,
    autoplaySpeed: 4000,
    cssEase: 'ease-in-out',
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    responsive: [
      {
        breakpoint: 500,
        settings: {
          slidesToShow: Math.min(items.length, 2),
          slidesToScroll: Math.min(items.length, 2)
        }
      }
    ]
  };

  return (
    <div className={`container ${styles.itemlistmargin} ${styles.carouselContainer}`}>
      <h1>{heading}</h1>
      <Slider {...settings}>
        {items.map((item, index) => (
          <div key={index} onClick={() => handleClick(item.itemId)}>
            <MainPageItemCard
              img={item.thumbnail}
              category={item.category}
              name={item.itemTitle}
              startprice={item.startPrice}
              nowprice={item.buyNowPrice}
            />
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default MainPageItem;
