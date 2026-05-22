pipeline {
    agent any

    environment {
        AWS_REGION     = 'eu-north-1'
        ECR_REGISTRY   = '886682669061.dkr.ecr.eu-north-1.amazonaws.com'
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/ayanchoudhary76/onlineAttendeceSystem'
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([aws(credentialsId: 'aws-credentials')]) {
                    sh '''
                        aws ecr get-login-password --region $AWS_REGION | \
                        docker login --username AWS --password-stdin $ECR_REGISTRY
                    '''
                }
            }
        }

        stage('Build & Push Backend') {
            steps {
                sh '''
                    docker build -t $ECR_REGISTRY/ayanchoudhary76/attendance-backend:$IMAGE_TAG ./backend
                    docker push $ECR_REGISTRY/ayanchoudhary76/attendance-backend:$IMAGE_TAG
                    docker tag $ECR_REGISTRY/ayanchoudhary76/attendance-backend:$IMAGE_TAG \
                               $ECR_REGISTRY/ayanchoudhary76/attendance-backend:latest
                    docker push $ECR_REGISTRY/ayanchoudhary76/attendance-backend:latest
                '''
            }
        }

        stage('Build & Push Frontend') {
            steps {
                sh '''
                    docker build \
                      --build-arg VITE_API_URL=http://backend-service:5000 \
                      -t $ECR_REGISTRY/ayanchoudhary76/attendance-frontend:$IMAGE_TAG ./frontend
                    docker push $ECR_REGISTRY/ayanchoudhary76/attendance-frontend:$IMAGE_TAG
                    docker tag $ECR_REGISTRY/ayanchoudhary76/attendance-frontend:$IMAGE_TAG \
                               $ECR_REGISTRY/ayanchoudhary76/attendance-frontend:latest
                    docker push $ECR_REGISTRY/ayanchoudhary76/attendance-frontend:latest
                '''
            }
        }

        stage('Deploy to EKS') {
            steps {
                withCredentials([aws(credentialsId: 'aws-credentials')]) {
                    sh '''
                        aws eks update-kubeconfig --region $AWS_REGION --name attendance-cluster
                        kubectl apply -f k8s/backend-deployment.yaml
                        kubectl apply -f k8s/frontend-deployment.yaml
                        kubectl rollout restart deployment/backend
                        kubectl rollout restart deployment/frontend
                    '''
                }
            }
        }
    }

    post {
        success { echo '✅ Deployment successful!' }
        failure  { echo '❌ Pipeline failed. Check logs.' }
    }
}