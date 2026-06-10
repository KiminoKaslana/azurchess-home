import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { IS_TEST } from '../config/envConfig';

const useScreenshots = () => {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScreenshots = () => {
      try {
        const screenshotCount = 5; // ss1 到 ss5 共 5 张截图
        const images = Array.from({ length: screenshotCount }, (_, i) => `/screenshot/ss${i + 1}.png`);
        setScreenshots(images);
      } catch (error) {
        console.error('加载截图失败:', error);
        setScreenshots(['/screenshot/ss1.png']);
      } finally {
        setLoading(false);
      }
    };

    fetchScreenshots();
  }, []);

  return { screenshots, loading };
};

// 测试服简介（暗色 / 新版式）—— 当前工作区现状
const TestAbout = () => {
  const { screenshots, loading } = useScreenshots();

  return (
    <div className="acb-about" id="about">
      <div className="container">
        <div className="acb-about__inner">
          {/* 游戏简介文案 */}
          <div className="acb-about__text">
            <h2 className="acb-about__title">游戏简介</h2>
            <p className="acb-about__desc">
              碧蓝战棋(AzurChess)是碧蓝航线的同人游戏，
              原型最初由哔哩哔哩up主
              <a href="https://space.bilibili.com/404682135" target="_blank" rel="noopener noreferrer">
                @韦德_WAYD
              </a>
              设计，后由
              <a href="https://space.bilibili.com/35762009" target="_blank" rel="noopener noreferrer">
                @SylviaKaslana
              </a>
              独立开发。游戏沿用碧蓝航线八大阵营的设定，
              每个玩家操纵一个阵营，配置自己的舰队，
              在世界地图为原型的舞台上战斗。
            </p>
          </div>

          {/* 游戏截图轮播 */}
          <div className="acb-about__media">
            {loading ? (
              <div className="acb-about__placeholder" />
            ) : (
              <Swiper
                className="acb-about__carousel"
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={0}
                slidesPerView={1}
                navigation
                pagination={{ clickable: true }}
                autoplay={{ delay: 3000 }}
                loop={true}
              >
                {screenshots.map((imgUrl, index) => (
                  <SwiperSlide key={index}>
                    <img
                      className="acb-about__shot"
                      src={imgUrl}
                      alt={`游戏截图${index + 1}`}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 正式服简介（亮色 / 原版式）—— 还原 main 分支
const ProdAbout = () => {
  const { screenshots, loading } = useScreenshots();

  return (
    <div className="aboutus-layout-1" id="about" style={{ padding: '20vh 0' }}>
      <div className="container">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 游戏简介内容 */}
          <div style={{ flex: '1', minWidth: '300px', padding: '0 60px' }}>
            <div className="about-content">
              <h2 style={{ fontSize: '32px', marginBottom: '20px', color: '#333' }}>游戏简介</h2>
              <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#666' }}>
                碧蓝战棋(AzurChess)是碧蓝航线的同人游戏，
                原型最初由哔哩哔哩up主
                <a href="https://space.bilibili.com/404682135" target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
                  @韦德_WAYD
                </a>设计，
                后由
                <a href="https://space.bilibili.com/35762009" target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff' }}>
                  @SylviaKaslana
                </a>独立开发。
                游戏沿用碧蓝航线八大阵营的设定，
                每个玩家操纵一个阵营，配置自己的舰队，
                在世界地图为原型的舞台上战斗。
              </p>
            </div>
          </div>

          {/* 动态加载的截图轮播 */}
          <div style={{ flex: '1', minWidth: '300px', padding: '0 40px', marginTop: '30px' }}>
            {loading ? (
              <div style={{
                height: '400px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#f5f5f5',
                borderRadius: '12px'
              }}>
              </div>
            ) : (
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={10}
                slidesPerView={1}
                navigation
                pagination={{ clickable: true }}
                autoplay={{ delay: 3000 }}
                loop={true}
                style={{ borderRadius: '12px', overflow: 'hidden' }}
              >
                {screenshots.map((imgUrl, index) => (
                  <SwiperSlide key={index}>
                    <img
                      src={imgUrl}
                      alt={`游戏截图${index + 1}`}
                      style={{
                        width: '100%',
                        height: '400px',
                        borderRadius: '12px',
                        objectFit: 'cover',
                        background: '#f5f5f5'
                      }}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const About = () => (IS_TEST ? <TestAbout /> : <ProdAbout />);

export default About;
