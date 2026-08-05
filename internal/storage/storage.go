package storage

import (
	"context"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"agentic-kanban/internal/config"
	"agentic-kanban/internal/utils"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Uploader struct {
	cfg config.Config
	s3  *s3.Client
}

func New(cfg config.Config) (*Uploader, error) {
	u := &Uploader{cfg: cfg}
	if u.cfg.UploadDir == "" {
		u.cfg.UploadDir = "data/uploads"
	}
	if cfg.UploadStorage == "s3" {
		if cfg.S3Bucket == "" {
			return nil, fmt.Errorf("S3_BUCKET is required when UPLOAD_STORAGE=s3")
		}
		opts := []func(*awsconfig.LoadOptions) error{awsconfig.WithRegion(cfg.S3Region)}
		if cfg.S3AccessKey != "" {
			opts = append(opts, awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.S3AccessKey, cfg.S3SecretKey, "")))
		}
		loaded, err := awsconfig.LoadDefaultConfig(context.Background(), opts...)
		if err != nil {
			return nil, err
		}
		s3opts := func(o *s3.Options) {
			if cfg.S3Endpoint != "" {
				o.BaseEndpoint = aws.String(cfg.S3Endpoint)
				o.UsePathStyle = true
			}
		}
		u.s3 = s3.NewFromConfig(loaded, s3opts)
	} else if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		return nil, err
	}
	return u, nil
}

func (u *Uploader) Save(ctx context.Context, file *multipart.FileHeader) (string, error) {
	ext := filepath.Ext(file.Filename)
	if len(ext) > 12 {
		ext = ""
	}
	key := "tasks/" + utils.NewID("img") + ext
	f, err := file.Open()
	if err != nil {
		return "", err
	}
	defer f.Close()
	if u.cfg.UploadStorage == "s3" {
		_, err = u.s3.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(u.cfg.S3Bucket), Key: aws.String(key), Body: f, ContentType: aws.String(file.Header.Get("Content-Type"))})
		if err != nil {
			return "", err
		}
		base := u.cfg.S3PublicURL
		if base == "" {
			if u.cfg.S3Endpoint != "" {
				base = strings.TrimRight(u.cfg.S3Endpoint, "/") + "/" + u.cfg.S3Bucket
			} else {
				base = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", u.cfg.S3Bucket, u.cfg.S3Region)
			}
		}
		return strings.TrimRight(base, "/") + "/" + key, nil
	}
	dest := filepath.Join(u.cfg.UploadDir, key)
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return "", err
	}
	out, err := os.Create(dest)
	if err != nil {
		return "", err
	}
	defer out.Close()
	if _, err = io.Copy(out, f); err != nil {
		return "", err
	}
	base := u.cfg.UploadPublicURL
	if base == "" {
		base = "/uploads"
	}
	return strings.TrimRight(base, "/") + "/" + key, nil
}

func (u *Uploader) LocalDir() string {
	if u.cfg.UploadStorage == "s3" {
		return ""
	}
	return u.cfg.UploadDir
}

func Validate(file *multipart.FileHeader) error {
	if file == nil || file.Size == 0 {
		return fmt.Errorf("empty image")
	}
	if file.Size > 10<<20 {
		return fmt.Errorf("image exceeds 10MB limit")
	}
	f, err := file.Open()
	if err != nil {
		return err
	}
	defer f.Close()
	header := make([]byte, 512)
	n, err := f.Read(header)
	if err != nil && err != io.EOF {
		return err
	}
	ct := http.DetectContentType(header[:n])
	if !strings.HasPrefix(ct, "image/") {
		return fmt.Errorf("only image uploads are supported")
	}
	return nil
}
