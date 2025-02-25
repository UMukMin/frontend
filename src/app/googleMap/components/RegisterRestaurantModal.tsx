import React from 'react';
import { RestaurantData } from '../types';
import { translations } from '@/app/translations';
import { Language } from '@/app/types';

interface RegisterRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<RestaurantData>) => void;
  initialData: Partial<RestaurantData>;
  currentLanguage: Language;
}

const RegisterRestaurantModal: React.FC<RegisterRestaurantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  currentLanguage,
}) => {
  const [registerForm, setRegisterForm] = React.useState<Partial<RestaurantData>>(initialData);

  const handleRegisterFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentMethodChange = (method: string) => {
    setRegisterForm(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods?.includes(method)
        ? prev.paymentMethods.filter(m => m !== method)
        : [...(prev.paymentMethods || []), method]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(registerForm);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">
          {translations[currentLanguage].location.registerRestaurant}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 매장명 - 읽기 전용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations[currentLanguage].location.storeName}
            </label>
            <input
              type="text"
              name="name"
              value={registerForm.name || ''}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-gray-50"
              required
              readOnly
            />
          </div>

          {/* 주소 - 읽기 전용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations[currentLanguage].location.address}
            </label>
            <input
              type="text"
              name="address"
              value={registerForm.address || ''}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-gray-50"
              required
              readOnly
            />
          </div>

          {/* 지역 - 읽기 전용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              지역
            </label>
            <input
              type="text"
              name="region"
              value={registerForm.region || ''}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-gray-50"
              required
              readOnly
            />
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리
            </label>
            <select
              name="category"
              value={registerForm.category || ''}
              onChange={handleRegisterFormChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">선택해주세요</option>
              <option value="한식">한식</option>
              <option value="일식">일식</option>
              <option value="중식">중식</option>
              <option value="양식">양식</option>
              <option value="카페">카페</option>
              <option value="기타">기타</option>
            </select>
          </div>

          {/* 영업시간 - 읽기 전용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              영업시간
            </label>
            <textarea
              name="openingHours"
              value={registerForm.openingHours || ''}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary bg-gray-50"
              rows={3}
              readOnly
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              name="description"
              value={registerForm.description || ''}
              onChange={handleRegisterFormChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>

          {/* 평점 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              평점
            </label>
            <div className="flex items-center space-x-1">
              {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => {
                    setRegisterForm(prev => ({
                      ...prev,
                      rating: score
                    }));
                  }}
                  className="focus:outline-none"
                >
                  <div className="relative w-6 h-6">
                    <span className={`google-symbols ${
                      score <= (registerForm.rating ?? 0) 
                        ? 'text-yellow-400' 
                        : 'text-gray-300'
                    }`}>
                      {score % 1 === 0 ? 'star' : 'star_half'}
                    </span>
                  </div>
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {registerForm.rating ?? 0} / 3
              </span>
            </div>
          </div>

          {/* 평균 가격 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              평균 가격
            </label>
            <input
              type="number"
              name="averagePrice"
              value={registerForm.averagePrice || ''}
              onChange={handleRegisterFormChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              min="0"
              step="1000"
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전화번호
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={registerForm.phoneNumber || ''}
              onChange={handleRegisterFormChange}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 결제 수단 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              결제 수단
            </label>
            <div className="flex flex-wrap gap-2">
              {['현금', '카드', '계좌이체', 'Apple Pay'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => handlePaymentMethodChange(method)}
                  className={`px-3 py-1 rounded ${
                    registerForm.paymentMethods?.includes(method)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-gradient hover:bg-primary-gradient-hover text-white rounded transition-all duration-300 ease-in-out hover:shadow-lg hover:translate-y-[-2px] active:translate-y-[1px]"
            >
              {translations[currentLanguage].location.register}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterRestaurantModal; 