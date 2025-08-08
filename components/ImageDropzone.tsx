import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageDropzoneProps {
  onImageSelect: (file: File) => void
  onImageRemove: () => void
  selectedImage: string | null
  disabled?: boolean
  t: (key: string) => string
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  onImageSelect,
  onImageRemove,
  selectedImage,
  disabled = false,
  t,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onImageSelect(acceptedFiles[0])
      }
    },
    [onImageSelect],
  )

  const { getRootProps, getInputProps, isDragReject, isDragActive } =
    useDropzone({
      onDrop,
      accept: {
        'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
      },
      maxFiles: 1,
      disabled,
    })

  const handleRemoveImage = () => {
    onImageRemove()
  }

  return (
    <div className="w-full">
      {selectedImage ? (
        <div className="relative">
          {/* 선택된 이미지 박스 */}
          <div className="relative w-full h-48 max-h-96 border-2 border-black bg-white overflow-hidden rounded-base">
            <Image
              src={selectedImage}
              alt="Selected image"
              fill
              className="object-contain"
            />
          </div>

          {/* X 버튼 */}
          <Button
            variant="destructive"
            size="icon"
            onClick={handleRemoveImage}
            disabled={disabled}
            className="absolute top-4 right-4"
          >
            <X size={16} strokeWidth={3} />
          </Button>
        </div>
      ) : (
        // 드롭존 영역
        <div
          {...getRootProps()}
          className={`
            w-full h-32 border-2 border-dashed border-black rounded-base cursor-pointer
            transition-colors flex flex-col items-center justify-center gap-2
            ${isDragActive && !isDragReject ? 'bg-green-300' : 'bg-white'}
            ${isDragReject ? 'bg-red-300' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-background'}
          `}
        >
          <input {...getInputProps()} />
          <Upload size={24} className="text-black" />
          <div className="text-sm text-center">
            <span className="font-bold text-black">
              {isDragActive
                ? t('steps.step2.dropHere')
                : t('steps.step2.clickOrDrag')}
            </span>
            <br />
            <span className="text-black">{t('steps.step2.imageFormats')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageDropzone
