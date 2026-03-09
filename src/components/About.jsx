import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const About = () => {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);

  // 动态加载游戏截图
  useEffect(() => {
    const fetchScreenshots = () => {
      try {
        // 按命名规则生成截图路径（ss1.png至ss5.png）
        const screenshotCount = 5; // ss1到ss5共5张截图
        const images = Array.from({ length: screenshotCount }, (_, i) => 
          `/screenshot/ss${i + 1}.png` // 图片存放于public/screenshot目录
        );
        setScreenshots(images);
      } catch (error) {
        console.error('加载截图失败:', error);
        // 失败时使用默认图
        setScreenshots(['/screenshot/ss1.png']);
      } finally {
        setLoading(false);
      }
    };

    fetchScreenshots();
  }, []);

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
                borderRadius: '12px'  // 加载状态也保持一致的圆角
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
                style={{ borderRadius: '12px', overflow: 'hidden' }}  // 为轮播容器添加圆角并隐藏溢出内容
              >
                {screenshots.map((imgUrl, index) => (
                  <SwiperSlide key={index}>
                    <img 
                      src={imgUrl} 
                      alt={`游戏截图${index + 1}`} 
                      style={{ 
                        width: '100%', 
                        height: '400px',  // 固定高度确保图片填充
                        borderRadius: '12px',  // 图片本身也添加圆角
                        objectFit: 'cover',  // 改为缩放以填满元素（可能裁剪图片）
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

export default About;