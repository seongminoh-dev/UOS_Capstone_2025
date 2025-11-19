import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import type { Scene } from '../graphics-core/service/Scene';
import { useSceneStore } from '../stores/sceneStore';
import { AVAILABLE_SCENES } from '../graphics-core/test/DummyScenes';
import './EditPage.css';

export default function EditPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'objects' | 'lights'>('objects');
  const [scene, setScene] = useState<Scene | null>(null);
  const [showSceneSelectModal, setShowSceneSelectModal] = useState(false);

  // Scene Store
  const { updateScene, createScene, scenes, loadScenes } = useSceneStore();

  useEffect(() => {
    // Scene 목록 로드
    loadScenes();
  }, [loadScenes]);

  useEffect(() => {
    // 전달받은 Scene 데이터 확인
    if (location.state?.scene) {
      setScene(location.state.scene as Scene);
      setShowSceneSelectModal(false);
    } else {
      // Scene이 없으면 선택 모달 표시
      setShowSceneSelectModal(true);
    }
  }, [location.state]);

  // 새 Scene 생성
  const handleCreateNewScene = async () => {
    try {
      const newScene = await createScene({
        name: `새 Scene ${scenes.length + 1}`,
        description: '새로 생성된 Scene입니다.',
        assets: AVAILABLE_SCENES[0]?.assets || [],
      });
      setScene(newScene);
      setShowSceneSelectModal(false);
    } catch (error) {
      console.error('Failed to create scene:', error);
      alert('Scene 생성에 실패했습니다.');
    }
  };

  // Scene 목록에서 선택
  const handleSelectFromList = (selectedScene: Scene) => {
    setScene(selectedScene);
    setShowSceneSelectModal(false);
  };

  const objectAssets = scene?.assets.filter((a) => a.type === 'object') || [];
  const lightAssets = scene?.assets.filter((a) =>
    ['directional-light', 'point-light', 'rect-light'].includes(a.type)
  ) || [];

  const handleCancel = () => {
    navigate('/');
  };

  const handleSave = async () => {
    if (!scene) return;

    try {
      // Scene 저장 (게스트: 메모리, 회원: API)
      await updateScene(scene);
      navigate('/');
    } catch (error) {
      console.error('Failed to save scene:', error);
      alert('Scene 저장에 실패했습니다.');
    }
  };

  return (
    <>
      <Header />

      {/* Scene 선택 모달 */}
      {showSceneSelectModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Scene 선택</h2>
              <button className="modal-close" onClick={() => navigate('/')}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <p style={{ marginBottom: '20px', color: '#6B6B6B' }}>
                편집할 Scene을 선택하거나 새로 만드세요.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <button
                  className="modal-button modal-save"
                  onClick={handleCreateNewScene}
                  style={{ width: '100%' }}
                >
                  새 Scene 만들기
                </button>

                {(scenes.length > 0 || AVAILABLE_SCENES.length > 0) && (
                  <>
                    <div style={{ textAlign: 'center', color: '#6B6B6B', margin: '8px 0' }}>
                      또는
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                        기존 Scene 불러오기
                      </h3>
                      {[...scenes, ...AVAILABLE_SCENES].map((s) => (
                        <button
                          key={s.id}
                          className="asset-item clickable"
                          onClick={() => handleSelectFromList(s)}
                          style={{ marginBottom: '8px' }}
                        >
                          <div className="asset-info">
                            <span className="asset-icon">🎬</span>
                            <span className="asset-name">{s.name}</span>
                          </div>
                          <span className="asset-edit">선택</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="edit-container">
        <div className="edit-layout">
          {/* Left side - Three.js Canvas (미리보기) */}
          <div className="preview-canvas">
            <div className="canvas-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">🎨</div>
                <h3>Scene 편집 미리보기</h3>
                <p>Three.js 실시간 렌더링 영역</p>
                <p className="placeholder-note">
                  Path Tracing이 적용되지 않는<br />
                  빠른 미리보기 환경입니다
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Edit Panel */}
          <div className="edit-panel">
            <div className="edit-panel-header">
              <h1 className="edit-title">{scene?.name || 'Scene'} 편집</h1>
              <p className="edit-subtitle">
                가구와 조명을 배치하고 실시간으로 확인하세요
              </p>

              {/* Tab Navigation */}
              <div className="edit-tab-nav">
                <button
                  className={`edit-tab-button ${activeTab === 'objects' ? 'active' : ''}`}
                  onClick={() => setActiveTab('objects')}
                >
                  가구
                </button>
                <button
                  className={`edit-tab-button ${activeTab === 'lights' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lights')}
                >
                  조명
                </button>
              </div>
            </div>

            <div className="edit-panel-content">
              {activeTab === 'objects' && (
                <div className="edit-section">
                  <h3 className="section-title">가구 추가</h3>
                  <div className="object-grid">
                    <button className="object-add-button">
                      <span className="object-icon">🪑</span>
                      <span>의자</span>
                    </button>
                    <button className="object-add-button">
                      <span className="object-icon">🛋️</span>
                      <span>소파</span>
                    </button>
                    <button className="object-add-button">
                      <span className="object-icon">🪟</span>
                      <span>창문</span>
                    </button>
                    <button className="object-add-button">
                      <span className="object-icon">📦</span>
                      <span>기타</span>
                    </button>
                  </div>

                  <div className="divider"></div>

                  <h3 className="section-title">배치된 오브젝트</h3>
                  <div className="object-list">
                    {objectAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`object-item ${asset.meshName === 'TestScene' ? 'required' : ''}`}
                      >
                        <span className="object-name">
                          {asset.meshName}
                          {asset.meshName === 'TestScene' && ' (방)'}
                        </span>
                        {asset.meshName === 'TestScene' && (
                          <span className="object-required">필수</span>
                        )}
                      </div>
                    ))}
                    {objectAssets.filter((a) => a.meshName !== 'TestScene').length === 0 && (
                      <div className="empty-state">오브젝트를 추가해보세요</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'lights' && (
                <div className="edit-section">
                  <h3 className="section-title">조명 추가</h3>
                  <div className="light-grid">
                    <button className="light-add-button">
                      <span className="light-icon">☀️</span>
                      <span>태양광</span>
                    </button>
                    <button className="light-add-button">
                      <span className="light-icon">💡</span>
                      <span>포인트</span>
                    </button>
                    <button className="light-add-button">
                      <span className="light-icon">🔲</span>
                      <span>면광원</span>
                    </button>
                  </div>

                  <div className="divider"></div>

                  <h3 className="section-title">배치된 조명</h3>
                  <div className="light-list">
                    {lightAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`light-item ${asset.type === 'directional-light' ? 'required' : ''}`}
                      >
                        <span className="light-name">
                          {asset.type === 'directional-light' && 'DirectionalLight (태양)'}
                          {asset.type === 'point-light' && 'PointLight'}
                          {asset.type === 'rect-light' && 'RectLight'}
                        </span>
                        {asset.type === 'directional-light' && (
                          <span className="light-required">필수</span>
                        )}
                      </div>
                    ))}
                    {lightAssets.filter((a) => a.type !== 'directional-light').length === 0 && (
                      <div className="empty-state">조명을 추가해보세요</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="edit-actions">
              <button className="action-button action-cancel" onClick={handleCancel}>
                취소
              </button>
              <button className="action-button action-save" onClick={handleSave}>
                저장
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
