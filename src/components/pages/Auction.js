import React, { useState, useEffect, useRef } from 'react';
import ItemListInfoCard from "../commons/card/ItemListInfoCard";
import InfiniteScroll from 'react-infinite-scroll-component';
import FilterButton from '../commons/button/FilterButton';
import CategoryToggle from '../commons/toggle/CategoryToggle';
import '../../static/styles/css/auction.css'
import WriteImage from '../../static/styles/images/write.png'
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import EmptyImage from '../../static/styles/images/is_empty.png';

function Auction() {
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [keyword,setKeyword] = useState(null);
  const [filters, setFilters] = useState({
    region: "지역",
    tradingMethod: "거래 방법"
  });


  const location = useLocation();

  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  useEffect(() => {
    const categoryParam = params.get('category');
    const keywordParam = params.get('keyword');

    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }

    if (keyword) {
      setKeyword(keywordParam);
    }

    setItems([]);
    fetchData();
  }, [filters, location.search]);


  const handleCategoryChange = (category) => {
    if (category === null) {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    navigate(`?${params.toString()}`);

    setItems([]);
    setCurrentPage(0);
    setSelectedCategory(category);
  };

  const fetchData = async () => {
    setLoading(true);
    try {

      let regionValue = null;
      if (filters.region !== "전체" && filters.region !== "지역") {
        regionValue = filters.region;
      }

      let tradingMethodValue = null;
      if (filters.tradingMethod === "택배") {
        tradingMethodValue = 2;
      } else if (filters.tradingMethod === "직거래") {
        tradingMethodValue = 1;
      }

      const requestParams = {
        status: 'progress',
        page: currentPage
      };

      if (regionValue !== null) {
        requestParams.region = regionValue;
      }

      if (tradingMethodValue !== null) {
        requestParams.tradingMethod = tradingMethodValue
      }


      if (params.get('category') !== null) {
        requestParams.category = params.get('category')
      }

      if(params.get('keyword') !== null){
        requestParams.keyword = params.get('keyword');
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/v1/no-auth/auction`, {
        params: requestParams
      });


      const progressItemListDto = response.data.data;

      const newItems = progressItemListDto.progressItemListDto;

      newItems.forEach(item => {

        const processedItem = {
          itemId: item.itemId,
          itemTitle: item.itemTitle,
          category: item.category,
          tradingMethod: item.tradingMethod,
          thumbnail: item.thumbnail,
          startPrice: item.startPrice,
          currentPrice: item.currentPrice,
          buyNowPrice: item.buyNowPrice
        };
        setItems(prevItems => [...prevItems, processedItem]);

      });

      setCurrentPage(prevPage => prevPage + 1);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleFilterChange = (type, value) => {
    setItems([]);
    setCurrentPage(0);
    setFilters({ ...filters, [type]: value });
  };


  return (
    <div className='container container-zoom'>
      <CategoryToggle onSelectCategory={handleCategoryChange}></CategoryToggle>

      <div className='auction-filter'>
        <FilterButton handleFilterChange={handleFilterChange} selectedRegion={filters.region} selectedTradingMethod={filters.tradingMethod} />
        <Link to={localStorage.getItem("login") === "1" ? "/auction/form" : "/login"} className="btn btn-write">
          <span className="align-middle">글쓰기</span>
          <img src={WriteImage} alt="Button Image" className="align-middle btn-image" />
        </Link>
      </div>


      <div className='div-margin container'>
        <InfiniteScroll
          dataLength={items.length}
          next={fetchData}
          hasMore={hasMore}
          scrollThreshold={0.9}
          scrollableTarget="scrollableDiv"
          style={{ overflowX: 'hidden' }}
        >
          <div className="row" >
          {loading || items.length > 0  ? (
            items.map((item, index) => (
              <div key={index} className="col-md-6 item-card">
                <ItemListInfoCard
                  image={item.thumbnail}
                  title={item.itemTitle}
                  category={item.category}
                  categoryDetail={item.categoryDetail}
                  tradingMethod={item.tradingMethod}
                  startPrice={item.startPrice}
                  currentPrice={item.currentPrice}
                  itemId={item.itemId}
                  buyNowPrice={item.buyNowPrice}
                />
              </div>
            ))
          ) : (
            <div className="col-12 text-center">
              <img src={EmptyImage} className='empty-img'/>
            </div>
          )}
        </div>
        </InfiniteScroll>
      </div>
    </div>
  );
}

export default Auction;
